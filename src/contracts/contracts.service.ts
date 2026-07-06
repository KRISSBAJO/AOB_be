import { BadRequestException, Injectable } from "@nestjs/common";
import { ContractStatus, Prisma, RecurrenceFrequency } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListContractsQueryDto } from "./dto/contracts-query.dto";
import {
  AddContractFacilityDto,
  CreateContractDto,
  CreateContractScheduleDto,
  CreateContractServiceDto,
  UpdateContractDto,
  UpdateContractScheduleDto,
  UpdateContractServiceDto,
  UpdateContractStatusDto,
} from "./dto/contracts.dto";

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, query: ListContractsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["contractNumber", "title"]);
    const endDate = {
      ...(query.expiringAfter ? { gte: new Date(query.expiringAfter) } : {}),
      ...(query.expiringBefore ? { lte: new Date(query.expiringBefore) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(endDate).length ? { endDate } : {}),
      ...(search
        ? {
            OR: [
              ...search,
              { customer: { name: { contains: query.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
        include: {
          customer: { select: { id: true, name: true, status: true } },
          _count: {
            select: {
              facilities: true,
              services: true,
              schedules: true,
            },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async create(workspaceId: string, user: AuthenticatedUser, dto: CreateContractDto) {
    await this.assertCustomer(workspaceId, dto.customerId);
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    const signedAt = dto.signedAt ? new Date(dto.signedAt) : undefined;
    this.assertDateRange(startDate, endDate);

    return this.prisma.contract.create({
      data: {
        customerId: dto.customerId,
        workspaceId,
        createdById: user.id,
        contractNumber: dto.contractNumber?.trim() || (await this.generateContractNumber(workspaceId)),
        title: dto.title.trim(),
        status: dto.status,
        startDate,
        endDate,
        billingFrequency: dto.billingFrequency,
        totalValue: dto.totalValue,
        currency: dto.currency?.toUpperCase() ?? "USD",
        renewalNoticeDays: dto.renewalNoticeDays,
        signedAt,
        terms: dto.terms,
        notes: dto.notes,
      },
      include: this.contractInclude(),
    });
  }

  get(workspaceId: string, id: string) {
    return this.prisma.contract.findFirstOrThrow({
      where: { id, workspaceId },
      include: this.contractInclude(),
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateContractDto) {
    const current = await this.assertContract(workspaceId, id);

    if (dto.customerId) {
      await this.assertCustomer(workspaceId, dto.customerId);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : current.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : current.endDate ?? undefined;
    this.assertDateRange(startDate, endDate);

    return this.prisma.contract.update({
      where: { id, workspaceId },
      data: {
        customerId: dto.customerId,
        contractNumber: dto.contractNumber?.trim(),
        title: dto.title?.trim(),
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        billingFrequency: dto.billingFrequency,
        totalValue: dto.totalValue,
        currency: dto.currency?.toUpperCase(),
        renewalNoticeDays: dto.renewalNoticeDays,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
        terms: dto.terms,
        notes: dto.notes,
      },
      include: this.contractInclude(),
    });
  }

  async updateStatus(workspaceId: string, id: string, dto: UpdateContractStatusDto) {
    const contract = await this.assertContract(workspaceId, id);

    if (dto.status === ContractStatus.ACTIVE) {
      if (contract.endDate && contract.endDate < new Date()) {
        throw new BadRequestException("Expired contracts cannot be activated");
      }

      const [facilityCount, serviceCount] = await Promise.all([
        this.prisma.contractFacility.count({ where: { workspaceId, contractId: id } }),
        this.prisma.contractService.count({
          where: { workspaceId, contractId: id, isActive: true },
        }),
      ]);

      if (facilityCount === 0) {
        throw new BadRequestException("At least one facility is required before activation");
      }

      if (serviceCount === 0) {
        throw new BadRequestException("At least one active contract service is required before activation");
      }
    }

    return this.prisma.contract.update({
      where: { id, workspaceId },
      data: {
        status: dto.status,
        signedAt:
          dto.status === ContractStatus.ACTIVE && !contract.signedAt ? new Date() : undefined,
      },
      include: this.contractInclude(),
    });
  }

  terminate(workspaceId: string, id: string) {
    return this.prisma.contract.update({
      where: { id, workspaceId },
      data: { status: ContractStatus.TERMINATED },
      include: this.contractInclude(),
    });
  }

  async addFacility(workspaceId: string, contractId: string, dto: AddContractFacilityDto) {
    const contract = await this.assertContract(workspaceId, contractId);
    const facility = await this.prisma.facility.findFirstOrThrow({
      where: { id: dto.facilityId, workspaceId },
    });

    if (facility.customerId !== contract.customerId) {
      throw new BadRequestException("Facility must belong to the contract customer");
    }

    return this.prisma.contractFacility.upsert({
      where: {
        contractId_facilityId: {
          contractId,
          facilityId: dto.facilityId,
        },
      },
      create: {
        workspaceId,
        contractId,
        facilityId: dto.facilityId,
      },
      update: {},
      include: {
        facility: { select: { id: true, name: true, status: true, city: true, state: true } },
      },
    });
  }

  async removeFacility(workspaceId: string, contractId: string, facilityId: string) {
    await this.assertContract(workspaceId, contractId);

    return this.prisma.contractFacility.delete({
      where: {
        contractId_facilityId: { contractId, facilityId },
        workspaceId,
      },
    });
  }

  async listServices(workspaceId: string, contractId: string) {
    await this.assertContract(workspaceId, contractId);

    return this.prisma.contractService.findMany({
      where: { workspaceId, contractId },
      orderBy: [{ isActive: "desc" }, { serviceLine: "asc" }, { name: "asc" }],
      include: {
        service: { select: { id: true, name: true, code: true, isActive: true } },
      },
    });
  }

  async createService(workspaceId: string, contractId: string, dto: CreateContractServiceDto) {
    await this.assertContract(workspaceId, contractId);
    const linkedService = dto.serviceId
      ? await this.prisma.service.findFirstOrThrow({
          where: { id: dto.serviceId, workspaceId },
        })
      : undefined;

    if (linkedService && dto.serviceLine && dto.serviceLine !== linkedService.serviceLine) {
      throw new BadRequestException("Contract service line must match linked service");
    }

    const serviceLine = dto.serviceLine ?? linkedService?.serviceLine;
    const name = dto.name?.trim() ?? linkedService?.name;

    if (!serviceLine || !name) {
      throw new BadRequestException("serviceLine and name are required when no serviceId is provided");
    }

    return this.prisma.$transaction(async (tx) => {
      const contractService = await tx.contractService.create({
        data: {
          workspaceId,
          contractId,
          serviceId: dto.serviceId,
          serviceLine,
          name,
          description: dto.description ?? linkedService?.description ?? undefined,
          frequency: dto.frequency,
          quantity: dto.quantity ?? 1,
          unit: dto.unit ?? linkedService?.defaultUnit,
          price: dto.price ?? linkedService?.basePrice ?? undefined,
          isActive: dto.isActive,
        },
        include: {
          service: { select: { id: true, name: true, code: true, isActive: true } },
        },
      });

      await this.recalculateContractTotal(tx, workspaceId, contractId);
      return contractService;
    });
  }

  async updateContractService(
    workspaceId: string,
    id: string,
    dto: UpdateContractServiceDto,
  ) {
    const current = await this.prisma.contractService.findFirstOrThrow({
      where: { id, workspaceId },
    });
    const linkedService = dto.serviceId
      ? await this.prisma.service.findFirstOrThrow({
          where: { id: dto.serviceId, workspaceId },
        })
      : undefined;

    if (linkedService && dto.serviceLine && dto.serviceLine !== linkedService.serviceLine) {
      throw new BadRequestException("Contract service line must match linked service");
    }

    return this.prisma.$transaction(async (tx) => {
      const contractService = await tx.contractService.update({
        where: { id },
        data: {
          serviceId: dto.serviceId,
          serviceLine: dto.serviceLine ?? linkedService?.serviceLine,
          name: dto.name?.trim() ?? (dto.serviceId ? linkedService?.name : undefined),
          description:
            dto.description ?? (dto.serviceId ? linkedService?.description ?? undefined : undefined),
          frequency: dto.frequency,
          quantity: dto.quantity,
          unit: dto.unit ?? (dto.serviceId ? linkedService?.defaultUnit : undefined),
          price: dto.price ?? (dto.serviceId ? linkedService?.basePrice ?? undefined : undefined),
          isActive: dto.isActive,
        },
        include: {
          service: { select: { id: true, name: true, code: true, isActive: true } },
        },
      });

      await this.recalculateContractTotal(tx, workspaceId, current.contractId);
      return contractService;
    });
  }

  async deactivateContractService(workspaceId: string, id: string) {
    const current = await this.prisma.contractService.findFirstOrThrow({
      where: { id, workspaceId },
    });

    return this.prisma.$transaction(async (tx) => {
      const contractService = await tx.contractService.update({
        where: { id },
        data: { isActive: false },
      });

      await this.recalculateContractTotal(tx, workspaceId, current.contractId);
      return contractService;
    });
  }

  async listSchedules(workspaceId: string, contractId: string) {
    await this.assertContract(workspaceId, contractId);

    return this.prisma.contractSchedule.findMany({
      where: { workspaceId, contractId },
      orderBy: [{ isActive: "desc" }, { serviceLine: "asc" }, { dayOfWeek: "asc" }],
    });
  }

  async createSchedule(workspaceId: string, contractId: string, dto: CreateContractScheduleDto) {
    await this.assertContract(workspaceId, contractId);
    this.assertSchedule(dto.frequency, dto.dayOfWeek, dto.dayOfMonth);

    return this.prisma.contractSchedule.create({
      data: {
        ...dto,
        workspaceId,
        contractId,
      },
    });
  }

  updateSchedule(workspaceId: string, id: string, dto: UpdateContractScheduleDto) {
    this.assertSchedule(dto.frequency, dto.dayOfWeek, dto.dayOfMonth);

    return this.prisma.contractSchedule.update({
      where: { id, workspaceId },
      data: dto,
    });
  }

  deactivateSchedule(workspaceId: string, id: string) {
    return this.prisma.contractSchedule.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  private contractInclude() {
    return {
      customer: { select: { id: true, name: true, status: true } },
      createdBy: { select: { id: true, email: true, displayName: true } },
      facilities: {
        include: {
          facility: { select: { id: true, name: true, status: true, city: true, state: true } },
        },
        orderBy: { createdAt: "desc" as const },
      },
      services: {
        include: {
          service: { select: { id: true, name: true, code: true, isActive: true } },
        },
        orderBy: [{ isActive: "desc" as const }, { name: "asc" as const }],
      },
      schedules: {
        orderBy: [{ isActive: "desc" as const }, { serviceLine: "asc" as const }],
      },
    };
  }

  private assertCustomer(workspaceId: string, customerId: string) {
    return this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, workspaceId, deletedAt: null },
    });
  }

  private assertContract(workspaceId: string, contractId: string) {
    return this.prisma.contract.findFirstOrThrow({
      where: { id: contractId, workspaceId },
    });
  }

  private assertDateRange(startDate: Date, endDate?: Date) {
    if (endDate && endDate < startDate) {
      throw new BadRequestException("endDate cannot be earlier than startDate");
    }
  }

  private assertSchedule(
    frequency?: RecurrenceFrequency,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ) {
    if (dayOfWeek !== undefined && dayOfMonth !== undefined) {
      throw new BadRequestException("Use either dayOfWeek or dayOfMonth, not both");
    }

    const normalizedFrequency = frequency ?? RecurrenceFrequency.WEEKLY;

    if (
      (normalizedFrequency === RecurrenceFrequency.WEEKLY ||
        normalizedFrequency === RecurrenceFrequency.BIWEEKLY) &&
      dayOfMonth !== undefined
    ) {
      throw new BadRequestException("Weekly schedules use dayOfWeek");
    }
  }

  private async generateContractNumber(workspaceId: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const prefix = `AOG-${year}${month}`;
    let sequence =
      (await this.prisma.contract.count({
        where: { workspaceId, contractNumber: { startsWith: prefix } },
      })) + 1;

    while (true) {
      const contractNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const existing = await this.prisma.contract.findUnique({
        where: {
          workspaceId_contractNumber: {
            workspaceId,
            contractNumber,
          },
        },
      });

      if (!existing) {
        return contractNumber;
      }

      sequence += 1;
    }
  }

  private async recalculateContractTotal(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    contractId: string,
  ) {
    const rows = await tx.contractService.findMany({
      where: {
        workspaceId,
        contractId,
        isActive: true,
        price: { not: null },
      },
      select: {
        price: true,
        quantity: true,
      },
    });

    const total = rows.reduce((sum, row) => {
      if (row.price === null) return sum;
      return sum + Number(row.price) * Number(row.quantity);
    }, 0);

    await tx.contract.update({
      where: { id: contractId },
      data: { totalValue: rows.length ? total.toFixed(2) : null },
    });
  }
}
