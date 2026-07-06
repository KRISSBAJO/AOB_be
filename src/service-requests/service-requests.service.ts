import { BadRequestException, Injectable } from "@nestjs/common";
import { ServiceRequestStatus, WorkOrderStatus, WorkOrderTaskStatus } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListServiceRequestsQueryDto } from "./dto/service-requests-query.dto";
import {
  ConvertServiceRequestDto,
  CreateServiceRequestDto,
  CreateServiceRequestItemDto,
  UpdateServiceRequestDto,
  UpdateServiceRequestStatusDto,
} from "./dto/service-requests.dto";

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, query: ListServiceRequestsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["requestNumber", "title", "description"]);
    const requestedStartAt = {
      ...(query.startFrom ? { gte: new Date(query.startFrom) } : {}),
      ...(query.startTo ? { lte: new Date(query.startTo) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
      ...(query.assignedManagerId ? { assignedManagerId: query.assignedManagerId } : {}),
      ...(query.serviceLine ? { serviceLine: query.serviceLine } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(Object.keys(requestedStartAt).length ? { requestedStartAt } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: this.summaryInclude(),
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async create(workspaceId: string, user: AuthenticatedUser, dto: CreateServiceRequestDto) {
    await this.assertCustomer(workspaceId, dto.customerId);
    await this.assertFacility(workspaceId, dto.customerId, dto.facilityId);
    await this.assertContract(workspaceId, dto.customerId, dto.contractId);
    this.assertDateRange(dto.requestedStartAt, dto.requestedEndAt);

    return this.prisma.$transaction(async (tx) => {
      const serviceRequest = await tx.serviceRequest.create({
        data: {
          workspaceId,
          requestNumber: await this.generateRequestNumber(workspaceId),
          customerId: dto.customerId,
          facilityId: dto.facilityId,
          contractId: dto.contractId,
          createdById: user.id,
          requestedByContactId: dto.requestedByContactId,
          assignedManagerId: dto.assignedManagerId,
          title: dto.title.trim(),
          description: dto.description,
          serviceLine: dto.serviceLine,
          priority: dto.priority,
          status: dto.status,
          requestedStartAt: dto.requestedStartAt ? new Date(dto.requestedStartAt) : undefined,
          requestedEndAt: dto.requestedEndAt ? new Date(dto.requestedEndAt) : undefined,
          preferredTimeWindow: dto.preferredTimeWindow,
          isRecurring: dto.isRecurring,
          recurrenceRule: dto.recurrenceRule,
          estimatedAmount: dto.estimatedAmount,
        },
      });

      await tx.serviceRequestStatusHistory.create({
        data: {
          workspaceId,
          serviceRequestId: serviceRequest.id,
          toStatus: serviceRequest.status,
          changedById: user.id,
          note: "Request created",
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: serviceRequest.id },
        include: this.detailInclude(),
      });
    });
  }

  get(workspaceId: string, id: string) {
    return this.prisma.serviceRequest.findFirstOrThrow({
      where: { id, workspaceId },
      include: this.detailInclude(),
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateServiceRequestDto) {
    const current = await this.prisma.serviceRequest.findFirstOrThrow({
      where: { id, workspaceId },
    });
    const customerId = dto.customerId ?? current.customerId;

    if (dto.customerId) await this.assertCustomer(workspaceId, dto.customerId);
    if (dto.facilityId) await this.assertFacility(workspaceId, customerId, dto.facilityId);
    if (dto.contractId) await this.assertContract(workspaceId, customerId, dto.contractId);
    this.assertDateRange(
      dto.requestedStartAt ?? current.requestedStartAt?.toISOString(),
      dto.requestedEndAt ?? current.requestedEndAt?.toISOString(),
    );

    return this.prisma.serviceRequest.update({
      where: { id, workspaceId },
      data: {
        customerId: dto.customerId,
        facilityId: dto.facilityId,
        contractId: dto.contractId,
        requestedByContactId: dto.requestedByContactId,
        assignedManagerId: dto.assignedManagerId,
        title: dto.title?.trim(),
        description: dto.description,
        serviceLine: dto.serviceLine,
        priority: dto.priority,
        status: dto.status,
        requestedStartAt: dto.requestedStartAt ? new Date(dto.requestedStartAt) : undefined,
        requestedEndAt: dto.requestedEndAt ? new Date(dto.requestedEndAt) : undefined,
        preferredTimeWindow: dto.preferredTimeWindow,
        isRecurring: dto.isRecurring,
        recurrenceRule: dto.recurrenceRule,
        estimatedAmount: dto.estimatedAmount,
      },
      include: this.detailInclude(),
    });
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    user: AuthenticatedUser,
    dto: UpdateServiceRequestStatusDto,
  ) {
    const current = await this.prisma.serviceRequest.findFirstOrThrow({
      where: { id, workspaceId },
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceRequest.update({
        where: { id },
        data: {
          status: dto.status,
          approvedAt: dto.status === ServiceRequestStatus.APPROVED ? new Date() : undefined,
          cancelledAt: dto.status === ServiceRequestStatus.CANCELLED ? new Date() : undefined,
          completedAt: dto.status === ServiceRequestStatus.COMPLETED ? new Date() : undefined,
        },
      });

      await tx.serviceRequestStatusHistory.create({
        data: {
          workspaceId,
          serviceRequestId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          changedById: user.id,
          note: dto.note,
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: updated.id },
        include: this.detailInclude(),
      });
    });
  }

  approve(workspaceId: string, id: string, user: AuthenticatedUser) {
    return this.updateStatus(workspaceId, id, user, {
      status: ServiceRequestStatus.APPROVED,
      note: "Request approved",
    });
  }

  reject(workspaceId: string, id: string, user: AuthenticatedUser) {
    return this.updateStatus(workspaceId, id, user, {
      status: ServiceRequestStatus.REJECTED,
      note: "Request rejected",
    });
  }

  async addItem(workspaceId: string, serviceRequestId: string, dto: CreateServiceRequestItemDto) {
    await this.assertServiceRequest(workspaceId, serviceRequestId);
    const service = dto.serviceId
      ? await this.prisma.service.findFirstOrThrow({ where: { id: dto.serviceId, workspaceId } })
      : undefined;
    const quantity = dto.quantity ?? 1;
    const unitPrice = dto.unitPrice ?? (service?.basePrice ? Number(service.basePrice) : undefined);
    const lineTotal = unitPrice === undefined ? undefined : quantity * unitPrice;
    const serviceName = dto.serviceName?.trim() ?? service?.name;

    if (!serviceName) {
      throw new BadRequestException("serviceName is required when serviceId is not provided");
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.serviceRequestItem.create({
        data: {
          workspaceId,
          serviceRequestId,
          serviceId: dto.serviceId,
          serviceName,
          description: dto.description ?? service?.description ?? undefined,
          quantity,
          unit: dto.unit ?? service?.defaultUnit,
          estimatedDurationMinutes: dto.estimatedDurationMinutes ?? service?.estimatedDurationMinutes,
          unitPrice,
          lineTotal,
        },
      });

      await this.recalculateEstimatedAmount(tx, workspaceId, serviceRequestId);
      return item;
    });
  }

  async convertToWorkOrder(
    workspaceId: string,
    id: string,
    user: AuthenticatedUser,
    dto: ConvertServiceRequestDto,
  ) {
    const request = await this.prisma.serviceRequest.findFirstOrThrow({
      where: { id, workspaceId },
      include: { items: true },
    });

    if (
      request.status === ServiceRequestStatus.REJECTED ||
      request.status === ServiceRequestStatus.CANCELLED
    ) {
      throw new BadRequestException("Rejected or cancelled requests cannot become work orders");
    }

    if (dto.scheduledStartAt && dto.scheduledEndAt) {
      this.assertDateRange(dto.scheduledStartAt, dto.scheduledEndAt);
    }

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          workspaceId,
          workOrderNumber: await this.generateWorkOrderNumber(workspaceId),
          serviceRequestId: request.id,
          contractId: request.contractId,
          customerId: request.customerId,
          facilityId: request.facilityId,
          createdById: user.id,
          supervisorEmployeeId: dto.supervisorEmployeeId,
          title: request.title,
          description: request.description,
          serviceLine: request.serviceLine,
          priority: request.priority,
          status: WorkOrderStatus.CREATED,
          scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
          scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
          qaRequired: dto.qaRequired ?? true,
        },
      });

      if (request.items.length) {
        await tx.workOrderTask.createMany({
          data: request.items.map((item, index) => ({
            workspaceId,
            workOrderId: workOrder.id,
            title: item.serviceName,
            description: item.description,
            status: WorkOrderTaskStatus.TODO,
            sortOrder: index + 1,
          })),
        });
      }

      await tx.workOrderStatusHistory.create({
        data: {
          workspaceId,
          workOrderId: workOrder.id,
          toStatus: WorkOrderStatus.CREATED,
          changedById: user.id,
          note: "Converted from service request",
        },
      });

      await tx.serviceRequest.update({
        where: { id: request.id },
        data: { status: ServiceRequestStatus.SCHEDULED },
      });

      await tx.serviceRequestStatusHistory.create({
        data: {
          workspaceId,
          serviceRequestId: request.id,
          fromStatus: request.status,
          toStatus: ServiceRequestStatus.SCHEDULED,
          changedById: user.id,
          note: `Converted to work order ${workOrder.workOrderNumber}`,
        },
      });

      return tx.workOrder.findUniqueOrThrow({
        where: { id: workOrder.id },
        include: {
          customer: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          tasks: { orderBy: { sortOrder: "asc" } },
        },
      });
    });
  }

  async cancel(workspaceId: string, id: string, user: AuthenticatedUser) {
    return this.updateStatus(workspaceId, id, user, {
      status: ServiceRequestStatus.CANCELLED,
      note: "Request cancelled",
    });
  }

  private summaryInclude() {
    return {
      customer: { select: { id: true, name: true, status: true } },
      facility: { select: { id: true, name: true, status: true } },
      assignedManager: { select: { id: true, email: true, displayName: true } },
      _count: { select: { items: true, workOrders: true } },
    };
  }

  private detailInclude() {
    return {
      ...this.summaryInclude(),
      requestedByContact: { select: { id: true, firstName: true, lastName: true, email: true } },
      items: { orderBy: { createdAt: "asc" as const } },
      statusHistory: { orderBy: { createdAt: "desc" as const }, take: 20 },
      workOrders: { select: { id: true, workOrderNumber: true, title: true, status: true } },
    };
  }

  private assertCustomer(workspaceId: string, customerId: string) {
    return this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, workspaceId, deletedAt: null },
    });
  }

  private async assertFacility(workspaceId: string, customerId: string, facilityId?: string) {
    if (!facilityId) return;
    const facility = await this.prisma.facility.findFirstOrThrow({
      where: { id: facilityId, workspaceId },
    });
    if (facility.customerId !== customerId) {
      throw new BadRequestException("Facility must belong to the selected customer");
    }
  }

  private async assertContract(workspaceId: string, customerId: string, contractId?: string) {
    if (!contractId) return;
    const contract = await this.prisma.contract.findFirstOrThrow({
      where: { id: contractId, workspaceId },
    });
    if (contract.customerId !== customerId) {
      throw new BadRequestException("Contract must belong to the selected customer");
    }
  }

  private assertServiceRequest(workspaceId: string, id: string) {
    return this.prisma.serviceRequest.findFirstOrThrow({
      where: { id, workspaceId },
    });
  }

  private assertDateRange(start?: string, end?: string) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException("End date cannot be earlier than start date");
    }
  }

  private async generateRequestNumber(workspaceId: string) {
    const prefix = this.monthlyPrefix("SR");
    let sequence = (await this.prisma.serviceRequest.count({
      where: { workspaceId, requestNumber: { startsWith: prefix } },
    })) + 1;

    while (true) {
      const requestNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const existing = await this.prisma.serviceRequest.findUnique({
        where: { workspaceId_requestNumber: { workspaceId, requestNumber } },
      });
      if (!existing) return requestNumber;
      sequence += 1;
    }
  }

  private async generateWorkOrderNumber(workspaceId: string) {
    const prefix = this.monthlyPrefix("WO");
    let sequence = (await this.prisma.workOrder.count({
      where: { workspaceId, workOrderNumber: { startsWith: prefix } },
    })) + 1;

    while (true) {
      const workOrderNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const existing = await this.prisma.workOrder.findUnique({
        where: { workspaceId_workOrderNumber: { workspaceId, workOrderNumber } },
      });
      if (!existing) return workOrderNumber;
      sequence += 1;
    }
  }

  private monthlyPrefix(kind: string) {
    const now = new Date();
    return `${kind}-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private async recalculateEstimatedAmount(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    workspaceId: string,
    serviceRequestId: string,
  ) {
    const items = await tx.serviceRequestItem.findMany({
      where: { workspaceId, serviceRequestId, lineTotal: { not: null } },
      select: { lineTotal: true },
    });
    const total = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    await tx.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { estimatedAmount: items.length ? total.toFixed(2) : null },
    });
  }
}
