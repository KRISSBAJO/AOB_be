import { BadRequestException, Injectable } from "@nestjs/common";
import { CustomerStatus, FacilityStatus } from "@prisma/client";

import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto, CreateCustomerContactDto, UpdateCustomerContactDto, UpdateCustomerDto } from "./dto/customer.dto";
import { ListCustomersQueryDto, ListFacilitiesQueryDto } from "./dto/customer-query.dto";
import { CreateFacilityContactDto, CreateFacilityDto, UpdateFacilityContactDto, UpdateFacilityDto } from "./dto/facility.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(workspaceId: string, query: ListCustomersQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["code", "name", "billingEmail", "phone", "city", "state"]);
    const where = {
      workspaceId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.city ? { city: { contains: query.city, mode: "insensitive" as const } } : {}),
      ...(query.state ? { state: { contains: query.state, mode: "insensitive" as const } } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: {
              contacts: true,
              facilities: true,
              contracts: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  createCustomer(workspaceId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...dto,
        workspaceId,
        code: dto.code?.trim() || undefined,
        name: dto.name.trim(),
        billingEmail: dto.billingEmail?.trim().toLowerCase(),
      },
    });
  }

  getCustomer(workspaceId: string, id: string) {
    return this.prisma.customer.findFirstOrThrow({
      where: { id, workspaceId, deletedAt: null },
      include: {
        contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
        facilities: { orderBy: { name: "asc" } },
        contracts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            contractNumber: true,
            title: true,
            status: true,
            startDate: true,
            endDate: true,
            totalValue: true,
            currency: true,
          },
        },
      },
    });
  }

  updateCustomer(workspaceId: string, id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        code: dto.code?.trim(),
        name: dto.name?.trim(),
        billingEmail: dto.billingEmail?.trim().toLowerCase(),
      },
    });
  }

  archiveCustomer(workspaceId: string, id: string) {
    return this.prisma.customer.update({
      where: { id, workspaceId },
      data: {
        status: CustomerStatus.ARCHIVED,
        deletedAt: new Date(),
      },
    });
  }

  async listCustomerContacts(workspaceId: string, customerId: string) {
    await this.assertCustomer(workspaceId, customerId);

    return this.prisma.customerContact.findMany({
      where: { workspaceId, customerId },
      orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    });
  }

  async createCustomerContact(
    workspaceId: string,
    customerId: string,
    dto: CreateCustomerContactDto,
  ) {
    await this.assertCustomer(workspaceId, customerId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: { workspaceId, customerId },
          data: { isPrimary: false },
        });
      }

      return tx.customerContact.create({
        data: {
          ...dto,
          workspaceId,
          customerId,
          email: dto.email?.trim().toLowerCase(),
        },
      });
    });
  }

  async updateCustomerContact(workspaceId: string, id: string, dto: UpdateCustomerContactDto) {
    const contact = await this.prisma.customerContact.findFirstOrThrow({
      where: { id, workspaceId },
    });

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: { workspaceId, customerId: contact.customerId },
          data: { isPrimary: false },
        });
      }

      return tx.customerContact.update({
        where: { id },
        data: {
          ...dto,
          email: dto.email?.trim().toLowerCase(),
        },
      });
    });
  }

  deleteCustomerContact(workspaceId: string, id: string) {
    return this.prisma.customerContact.delete({
      where: { id, workspaceId },
    });
  }

  async listFacilities(workspaceId: string, query: ListFacilitiesQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["code", "name", "city", "state", "postalCode"]);
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.city ? { city: { contains: query.city, mode: "insensitive" as const } } : {}),
      ...(query.state ? { state: { contains: query.state, mode: "insensitive" as const } } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: {
          customer: { select: { id: true, name: true, status: true } },
          _count: {
            select: {
              contacts: true,
              contractFacilities: true,
              workOrders: true,
            },
          },
        },
      }),
      this.prisma.facility.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createFacility(workspaceId: string, dto: CreateFacilityDto) {
    await this.assertCustomer(workspaceId, dto.customerId);

    return this.prisma.facility.create({
      data: {
        ...dto,
        workspaceId,
        code: dto.code?.trim() || undefined,
        name: dto.name.trim(),
      },
      include: {
        customer: { select: { id: true, name: true, status: true } },
      },
    });
  }

  getFacility(workspaceId: string, id: string) {
    return this.prisma.facility.findFirstOrThrow({
      where: { id, workspaceId },
      include: {
        customer: { select: { id: true, name: true, status: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        contractFacilities: {
          include: {
            contract: {
              select: {
                id: true,
                contractNumber: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async updateFacility(workspaceId: string, id: string, dto: UpdateFacilityDto) {
    if (dto.customerId) {
      await this.assertCustomer(workspaceId, dto.customerId);
    }

    return this.prisma.facility.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        code: dto.code?.trim(),
        name: dto.name?.trim(),
      },
      include: {
        customer: { select: { id: true, name: true, status: true } },
      },
    });
  }

  archiveFacility(workspaceId: string, id: string) {
    return this.prisma.facility.update({
      where: { id, workspaceId },
      data: { status: FacilityStatus.ARCHIVED },
    });
  }

  async listFacilityContacts(workspaceId: string, facilityId: string) {
    await this.assertFacility(workspaceId, facilityId);

    return this.prisma.facilityContact.findMany({
      where: { workspaceId, facilityId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });
  }

  async createFacilityContact(
    workspaceId: string,
    facilityId: string,
    dto: CreateFacilityContactDto,
  ) {
    const facility = await this.assertFacility(workspaceId, facilityId);
    await this.assertCustomerContactAllowed(workspaceId, facility.customerId, dto.customerContactId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.facilityContact.updateMany({
          where: { workspaceId, facilityId },
          data: { isPrimary: false },
        });
      }

      return tx.facilityContact.create({
        data: {
          ...dto,
          workspaceId,
          facilityId,
          email: dto.email?.trim().toLowerCase(),
        },
      });
    });
  }

  async updateFacilityContact(workspaceId: string, id: string, dto: UpdateFacilityContactDto) {
    const contact = await this.prisma.facilityContact.findFirstOrThrow({
      where: { id, workspaceId },
      include: { facility: true },
    });

    await this.assertCustomerContactAllowed(
      workspaceId,
      contact.facility.customerId,
      dto.customerContactId,
    );

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.facilityContact.updateMany({
          where: { workspaceId, facilityId: contact.facilityId },
          data: { isPrimary: false },
        });
      }

      return tx.facilityContact.update({
        where: { id },
        data: {
          ...dto,
          email: dto.email?.trim().toLowerCase(),
        },
      });
    });
  }

  deleteFacilityContact(workspaceId: string, id: string) {
    return this.prisma.facilityContact.delete({
      where: { id, workspaceId },
    });
  }

  private assertCustomer(workspaceId: string, customerId: string) {
    return this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, workspaceId, deletedAt: null },
    });
  }

  private assertFacility(workspaceId: string, facilityId: string) {
    return this.prisma.facility.findFirstOrThrow({
      where: { id: facilityId, workspaceId },
    });
  }

  private async assertCustomerContactAllowed(
    workspaceId: string,
    customerId: string,
    customerContactId?: string,
  ) {
    if (!customerContactId) return;

    const contact = await this.prisma.customerContact.findFirst({
      where: { id: customerContactId, workspaceId, customerId },
    });

    if (!contact) {
      throw new BadRequestException("Customer contact does not belong to this facility customer");
    }
  }
}
