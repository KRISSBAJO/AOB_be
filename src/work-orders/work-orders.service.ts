import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, WorkOrderStatus, WorkOrderTaskStatus } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListWorkOrdersQueryDto } from "./dto/work-orders-query.dto";
import {
  CreateWorkOrderAssignmentDto,
  CreateWorkOrderDto,
  CreateWorkOrderPhotoDto,
  CreateWorkOrderSignoffDto,
  CreateWorkOrderTaskDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  UpdateWorkOrderTaskDto,
} from "./dto/work-orders.dto";

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, query: ListWorkOrdersQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["workOrderNumber", "title", "description"]);
    const scheduledStartAt = {
      ...(query.scheduledFrom ? { gte: new Date(query.scheduledFrom) } : {}),
      ...(query.scheduledTo ? { lte: new Date(query.scheduledTo) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
      ...(query.supervisorEmployeeId ? { supervisorEmployeeId: query.supervisorEmployeeId } : {}),
      ...(query.serviceLine ? { serviceLine: query.serviceLine } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(Object.keys(scheduledStartAt).length ? { scheduledStartAt } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take,
        orderBy: [{ scheduledStartAt: "asc" }, { createdAt: "desc" }],
        include: this.summaryInclude(),
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async create(workspaceId: string, user: AuthenticatedUser, dto: CreateWorkOrderDto) {
    await this.assertCustomer(workspaceId, dto.customerId);
    await this.assertFacility(workspaceId, dto.customerId, dto.facilityId);
    await this.assertEmployee(workspaceId, dto.supervisorEmployeeId);
    this.assertDateRange(dto.scheduledStartAt, dto.scheduledEndAt);

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          workspaceId,
          workOrderNumber: await this.generateWorkOrderNumber(workspaceId),
          serviceRequestId: dto.serviceRequestId,
          contractId: dto.contractId,
          customerId: dto.customerId,
          facilityId: dto.facilityId,
          createdById: user.id,
          supervisorEmployeeId: dto.supervisorEmployeeId,
          title: dto.title.trim(),
          description: dto.description,
          serviceLine: dto.serviceLine,
          priority: dto.priority,
          status: dto.status,
          scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
          scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
          qaRequired: dto.qaRequired,
          notes: dto.notes,
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workspaceId,
          workOrderId: workOrder.id,
          toStatus: workOrder.status,
          changedById: user.id,
          note: "Work order created",
        },
      });

      return tx.workOrder.findUniqueOrThrow({
        where: { id: workOrder.id },
        include: this.detailInclude(),
      });
    });
  }

  get(workspaceId: string, id: string) {
    return this.prisma.workOrder.findFirstOrThrow({
      where: { id, workspaceId },
      include: this.detailInclude(),
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateWorkOrderDto) {
    const current = await this.prisma.workOrder.findFirstOrThrow({
      where: { id, workspaceId },
    });
    const customerId = dto.customerId ?? current.customerId;
    if (dto.customerId) await this.assertCustomer(workspaceId, dto.customerId);
    if (dto.facilityId) await this.assertFacility(workspaceId, customerId, dto.facilityId);
    if (dto.supervisorEmployeeId) await this.assertEmployee(workspaceId, dto.supervisorEmployeeId);
    this.assertDateRange(
      dto.scheduledStartAt ?? current.scheduledStartAt?.toISOString(),
      dto.scheduledEndAt ?? current.scheduledEndAt?.toISOString(),
    );

    return this.prisma.workOrder.update({
      where: { id, workspaceId },
      data: {
        serviceRequestId: dto.serviceRequestId,
        contractId: dto.contractId,
        customerId: dto.customerId,
        facilityId: dto.facilityId,
        supervisorEmployeeId: dto.supervisorEmployeeId,
        title: dto.title?.trim(),
        description: dto.description,
        serviceLine: dto.serviceLine,
        priority: dto.priority,
        status: dto.status,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
        qaRequired: dto.qaRequired,
        notes: dto.notes,
      },
      include: this.detailInclude(),
    });
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    user: AuthenticatedUser,
    dto: UpdateWorkOrderStatusDto,
  ) {
    const current = await this.prisma.workOrder.findFirstOrThrow({
      where: { id, workspaceId },
    });

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.update({
        where: { id },
        data: {
          status: dto.status,
          startedAt: dto.status === WorkOrderStatus.IN_PROGRESS && !current.startedAt ? new Date() : undefined,
          completedAt: dto.status === WorkOrderStatus.COMPLETED ? new Date() : undefined,
          customerApprovedAt: dto.status === WorkOrderStatus.CUSTOMER_APPROVED ? new Date() : undefined,
          qaPassed:
            dto.qaPassed ??
            (dto.status === WorkOrderStatus.QA_PASSED
              ? true
              : dto.status === WorkOrderStatus.QA_FAILED
                ? false
                : undefined),
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workspaceId,
          workOrderId: id,
          fromStatus: current.status,
          toStatus: dto.status,
          changedById: user.id,
          note: dto.note,
        },
      });

      return tx.workOrder.findUniqueOrThrow({
        where: { id: workOrder.id },
        include: this.detailInclude(),
      });
    });
  }

  async addTask(workspaceId: string, workOrderId: string, dto: CreateWorkOrderTaskDto) {
    await this.assertWorkOrder(workspaceId, workOrderId);

    return this.prisma.workOrderTask.create({
      data: {
        workspaceId,
        workOrderId,
        title: dto.title.trim(),
        description: dto.description,
        status: dto.status,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async updateTask(workspaceId: string, id: string, dto: UpdateWorkOrderTaskDto) {
    await this.assertEmployee(workspaceId, dto.completedByEmployeeId);

    return this.prisma.workOrderTask.update({
      where: { id, workspaceId },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        status: dto.status,
        sortOrder: dto.sortOrder,
        completedByEmployeeId: dto.completedByEmployeeId,
        completedAt: dto.status === WorkOrderTaskStatus.DONE ? new Date() : undefined,
      },
    });
  }

  async addAssignment(
    workspaceId: string,
    workOrderId: string,
    dto: CreateWorkOrderAssignmentDto,
  ) {
    const workOrder = await this.assertWorkOrder(workspaceId, workOrderId);
    await this.assertEmployee(workspaceId, dto.employeeId);
    await this.assertWorkOrderAssignmentAvailability(workspaceId, dto.employeeId, workOrder);

    return this.prisma.workOrderAssignment.upsert({
      where: {
        workOrderId_employeeId_role: {
          workOrderId,
          employeeId: dto.employeeId,
          role: dto.role ?? "OTHER",
        },
      },
      create: {
        workspaceId,
        workOrderId,
        employeeId: dto.employeeId,
        role: dto.role,
        notes: dto.notes,
      },
      update: { notes: dto.notes },
      include: { employee: { select: { id: true, firstName: true, lastName: true, status: true } } },
    });
  }

  async addPhoto(
    workspaceId: string,
    workOrderId: string,
    user: AuthenticatedUser,
    dto: CreateWorkOrderPhotoDto,
  ) {
    await this.assertWorkOrder(workspaceId, workOrderId);
    await this.assertEmployee(workspaceId, dto.uploadedByEmployeeId);

    return this.prisma.workOrderPhoto.create({
      data: {
        workspaceId,
        workOrderId,
        uploadedByUserId: user.id,
        uploadedByEmployeeId: dto.uploadedByEmployeeId,
        type: dto.type,
        url: dto.url,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        notes: dto.notes,
      },
    });
  }

  async signoff(workspaceId: string, workOrderId: string, dto: CreateWorkOrderSignoffDto) {
    await this.assertWorkOrder(workspaceId, workOrderId);

    return this.prisma.$transaction(async (tx) => {
      const signoff = await tx.workOrderSignoff.create({
        data: {
          workspaceId,
          workOrderId,
          signedByContactId: dto.signedByContactId,
          signedByName: dto.signedByName.trim(),
          signatureUrl: dto.signatureUrl,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: WorkOrderStatus.CUSTOMER_APPROVED, customerApprovedAt: new Date() },
      });

      return signoff;
    });
  }

  cancel(workspaceId: string, id: string, user: AuthenticatedUser) {
    return this.updateStatus(workspaceId, id, user, {
      status: WorkOrderStatus.CANCELLED,
      note: "Work order cancelled",
    });
  }

  private summaryInclude() {
    return {
      customer: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { tasks: true, assignments: true, photos: true } },
    };
  }

  private detailInclude() {
    return {
      ...this.summaryInclude(),
      tasks: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, status: true } } },
      },
      photos: { orderBy: { createdAt: "desc" as const } },
      signoffs: { orderBy: { signedAt: "desc" as const } },
      statusHistory: { orderBy: { createdAt: "desc" as const }, take: 20 },
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

  private async assertEmployee(workspaceId: string, employeeId?: string) {
    if (!employeeId) return;
    await this.prisma.employee.findFirstOrThrow({
      where: { id: employeeId, workspaceId, status: { not: "TERMINATED" } },
    });
  }

  private assertWorkOrder(workspaceId: string, id: string) {
    return this.prisma.workOrder.findFirstOrThrow({ where: { id, workspaceId } });
  }

  private assertDateRange(start?: string, end?: string) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException("End date cannot be earlier than start date");
    }
  }

  private async assertWorkOrderAssignmentAvailability(
    workspaceId: string,
    employeeId: string,
    workOrder: { id: string; scheduledStartAt: Date | null; scheduledEndAt: Date | null },
  ) {
    if (!workOrder.scheduledStartAt || !workOrder.scheduledEndAt) return;

    const conflict = await this.prisma.workOrderAssignment.findFirst({
      where: {
        workspaceId,
        employeeId,
        workOrderId: { not: workOrder.id },
        workOrder: {
          status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
          scheduledStartAt: { lt: workOrder.scheduledEndAt },
          scheduledEndAt: { gt: workOrder.scheduledStartAt },
        },
      },
    });

    if (conflict) {
      throw new BadRequestException("Employee already has an overlapping work order assignment");
    }
  }

  private async generateWorkOrderNumber(workspaceId: string) {
    const now = new Date();
    const prefix = `WO-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    let sequence =
      (await this.prisma.workOrder.count({
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
}
