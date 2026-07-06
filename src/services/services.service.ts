import { BadRequestException, Injectable } from "@nestjs/common";

import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListServiceAreasQueryDto, ListServiceCategoriesQueryDto, ListServicesQueryDto } from "./dto/services-query.dto";
import {
  CreateServiceAreaDto,
  CreateServiceCategoryDto,
  CreateServiceDto,
  CreateServicePriceDto,
  CreateServiceRequirementDto,
  UpdateServiceAreaDto,
  UpdateServiceCategoryDto,
  UpdateServiceDto,
  UpdateServicePriceDto,
  UpdateServiceRequirementDto,
} from "./dto/services.dto";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(workspaceId: string, query: ListServiceCategoriesQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["name", "description"]);
    const where = {
      workspaceId,
      ...(query.serviceLine ? { serviceLine: query.serviceLine } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { services: true } } },
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  createCategory(workspaceId: string, dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: {
        ...dto,
        workspaceId,
        name: dto.name.trim(),
      },
    });
  }

  getCategory(workspaceId: string, id: string) {
    return this.prisma.serviceCategory.findFirstOrThrow({
      where: { id, workspaceId },
      include: { services: { orderBy: { name: "asc" } } },
    });
  }

  updateCategory(workspaceId: string, id: string, dto: UpdateServiceCategoryDto) {
    return this.prisma.serviceCategory.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        name: dto.name?.trim(),
      },
    });
  }

  deactivateCategory(workspaceId: string, id: string) {
    return this.prisma.serviceCategory.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  async listServices(workspaceId: string, query: ListServicesQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["code", "name", "description"]);
    const where = {
      workspaceId,
      ...(query.serviceLine ? { serviceLine: query.serviceLine } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: {
          category: { select: { id: true, name: true, serviceLine: true } },
          _count: {
            select: {
              prices: true,
              requirements: true,
              contractServices: true,
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createService(workspaceId: string, dto: CreateServiceDto) {
    if (dto.categoryId) {
      await this.assertCategoryMatchesServiceLine(workspaceId, dto.categoryId, dto.serviceLine);
    }

    return this.prisma.service.create({
      data: {
        ...dto,
        workspaceId,
        code: dto.code?.trim() || undefined,
        name: dto.name.trim(),
      },
      include: {
        category: { select: { id: true, name: true, serviceLine: true } },
      },
    });
  }

  getService(workspaceId: string, id: string) {
    return this.prisma.service.findFirstOrThrow({
      where: { id, workspaceId },
      include: {
        category: { select: { id: true, name: true, serviceLine: true } },
        prices: { orderBy: [{ isDefault: "desc" }, { amount: "asc" }] },
        requirements: { orderBy: [{ isMandatory: "desc" }, { name: "asc" }] },
      },
    });
  }

  async updateService(workspaceId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirstOrThrow({
      where: { id, workspaceId },
    });

    if (dto.categoryId) {
      await this.assertCategoryMatchesServiceLine(
        workspaceId,
        dto.categoryId,
        dto.serviceLine ?? service.serviceLine,
      );
    }

    return this.prisma.service.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        code: dto.code?.trim(),
        name: dto.name?.trim(),
      },
      include: {
        category: { select: { id: true, name: true, serviceLine: true } },
      },
    });
  }

  deactivateService(workspaceId: string, id: string) {
    return this.prisma.service.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  async listPrices(workspaceId: string, serviceId: string) {
    await this.assertService(workspaceId, serviceId);

    return this.prisma.servicePrice.findMany({
      where: { workspaceId, serviceId },
      orderBy: [{ isDefault: "desc" }, { amount: "asc" }],
    });
  }

  async createPrice(workspaceId: string, serviceId: string, dto: CreateServicePriceDto) {
    await this.assertService(workspaceId, serviceId);
    this.assertQuantityRange(dto.minQuantity, dto.maxQuantity);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.servicePrice.updateMany({
          where: { workspaceId, serviceId },
          data: { isDefault: false },
        });
      }

      return tx.servicePrice.create({
        data: {
          ...dto,
          workspaceId,
          serviceId,
          name: dto.name.trim(),
          currency: dto.currency?.toUpperCase() ?? "USD",
        },
      });
    });
  }

  async updatePrice(workspaceId: string, id: string, dto: UpdateServicePriceDto) {
    const price = await this.prisma.servicePrice.findFirstOrThrow({
      where: { id, workspaceId },
    });
    this.assertQuantityRange(dto.minQuantity, dto.maxQuantity);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.servicePrice.updateMany({
          where: { workspaceId, serviceId: price.serviceId },
          data: { isDefault: false },
        });
      }

      return tx.servicePrice.update({
        where: { id },
        data: {
          ...dto,
          name: dto.name?.trim(),
          currency: dto.currency?.toUpperCase(),
        },
      });
    });
  }

  deactivatePrice(workspaceId: string, id: string) {
    return this.prisma.servicePrice.update({
      where: { id, workspaceId },
      data: { isActive: false, isDefault: false },
    });
  }

  async listRequirements(workspaceId: string, serviceId: string) {
    await this.assertService(workspaceId, serviceId);

    return this.prisma.serviceRequirement.findMany({
      where: { workspaceId, serviceId },
      orderBy: [{ isMandatory: "desc" }, { name: "asc" }],
    });
  }

  async createRequirement(
    workspaceId: string,
    serviceId: string,
    dto: CreateServiceRequirementDto,
  ) {
    await this.assertService(workspaceId, serviceId);

    return this.prisma.serviceRequirement.create({
      data: {
        ...dto,
        workspaceId,
        serviceId,
        name: dto.name.trim(),
      },
    });
  }

  updateRequirement(workspaceId: string, id: string, dto: UpdateServiceRequirementDto) {
    return this.prisma.serviceRequirement.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        name: dto.name?.trim(),
      },
    });
  }

  deleteRequirement(workspaceId: string, id: string) {
    return this.prisma.serviceRequirement.delete({
      where: { id, workspaceId },
    });
  }

  async listAreas(workspaceId: string, query: ListServiceAreasQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["name", "city", "state", "postalCode", "country"]);
    const where = {
      workspaceId,
      ...(query.city ? { city: { contains: query.city, mode: "insensitive" as const } } : {}),
      ...(query.state ? { state: { contains: query.state, mode: "insensitive" as const } } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceArea.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      this.prisma.serviceArea.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  createArea(workspaceId: string, dto: CreateServiceAreaDto) {
    return this.prisma.serviceArea.create({
      data: {
        ...dto,
        workspaceId,
        name: dto.name.trim(),
      },
    });
  }

  updateArea(workspaceId: string, id: string, dto: UpdateServiceAreaDto) {
    return this.prisma.serviceArea.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        name: dto.name?.trim(),
      },
    });
  }

  deactivateArea(workspaceId: string, id: string) {
    return this.prisma.serviceArea.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  private assertService(workspaceId: string, serviceId: string) {
    return this.prisma.service.findFirstOrThrow({
      where: { id: serviceId, workspaceId },
    });
  }

  private async assertCategoryMatchesServiceLine(
    workspaceId: string,
    categoryId: string,
    serviceLine: string,
  ) {
    const category = await this.prisma.serviceCategory.findFirstOrThrow({
      where: { id: categoryId, workspaceId },
    });

    if (category.serviceLine !== serviceLine) {
      throw new BadRequestException("Category service line must match the service line");
    }
  }

  private assertQuantityRange(minQuantity?: number, maxQuantity?: number) {
    if (
      minQuantity !== undefined &&
      maxQuantity !== undefined &&
      Number(minQuantity) > Number(maxQuantity)
    ) {
      throw new BadRequestException("minQuantity cannot be greater than maxQuantity");
    }
  }
}
