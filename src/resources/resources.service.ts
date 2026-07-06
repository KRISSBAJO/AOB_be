import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ListResourcesQueryDto } from "./dto/list-resources-query.dto";
import {
  RESOURCE_DEFINITIONS,
  ResourceDefinition,
  isResourceName,
} from "./resource-definitions";

type PrismaDelegate = {
  findMany(args?: Record<string, unknown>): Promise<unknown[]>;
  count(args?: Record<string, unknown>): Promise<number>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
};

type WhereInput = Record<string, unknown>;

const SIMPLE_FILTER_FIELDS = [
  "workspaceId",
  "customerId",
  "facilityId",
  "status",
  "serviceLine",
  "priority",
] as const;

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  listResourceDefinitions() {
    return Object.entries(RESOURCE_DEFINITIONS).map(([name, definition]) => ({
      name,
      model: definition.model,
      description: definition.description,
      searchable: definition.searchFields ?? [],
      softDelete: Boolean(definition.softDelete),
    }));
  }

  async list(resource: string, query: ListResourcesQueryDto) {
    const definition = this.getDefinition(resource);
    const delegate = this.getDelegate(definition);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);
    const where = this.buildWhere(definition, query);
    const orderBy = this.buildOrderBy(query.orderBy);
    const select = this.parseJsonObject(query.select, "select");
    const include = this.parseJsonObject(query.include, "include");

    if (select && include) {
      throw new BadRequestException("Use either select or include, not both");
    }

    const args: Record<string, unknown> = {
      where,
      skip,
      take,
      orderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
    };

    const [data, total] = await Promise.all([
      delegate.findMany(args),
      delegate.count({ where }),
    ]);

    return {
      data,
      meta: {
        resource,
        model: definition.model,
        skip,
        take,
        total,
      },
    };
  }

  async findOne(resource: string, id: string) {
    const definition = this.getDefinition(resource);
    const delegate = this.getDelegate(definition);
    const record = await delegate.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`${definition.model} not found`);
    }

    return record;
  }

  create(resource: string, data: Record<string, unknown>) {
    const definition = this.getDefinition(resource);
    const delegate = this.getDelegate(definition);

    return delegate.create({ data });
  }

  update(resource: string, id: string, data: Record<string, unknown>) {
    const definition = this.getDefinition(resource);
    const delegate = this.getDelegate(definition);

    return delegate.update({ where: { id }, data });
  }

  delete(resource: string, id: string) {
    const definition = this.getDefinition(resource);
    const delegate = this.getDelegate(definition);

    if (definition.softDelete) {
      return delegate.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    return delegate.delete({ where: { id } });
  }

  private getDefinition(resource: string): ResourceDefinition {
    if (!isResourceName(resource)) {
      throw new NotFoundException(`Unsupported resource: ${resource}`);
    }

    return RESOURCE_DEFINITIONS[resource];
  }

  private getDelegate(definition: ResourceDefinition): PrismaDelegate {
    const delegate = (this.prisma as unknown as Record<string, PrismaDelegate>)[
      definition.delegate
    ];

    if (!delegate) {
      throw new NotFoundException(`Prisma delegate not found for ${definition.model}`);
    }

    return delegate;
  }

  private buildWhere(definition: ResourceDefinition, query: ListResourcesQueryDto) {
    const where = this.parseJsonObject(query.where, "where") ?? {};

    for (const field of SIMPLE_FILTER_FIELDS) {
      const value = query[field];

      if (value) {
        where[field] = value;
      }
    }

    if (query.search && definition.searchFields?.length) {
      where.OR = definition.searchFields.map((field) => ({
        [field]: {
          contains: query.search,
          mode: "insensitive",
        },
      }));
    }

    return where;
  }

  private buildOrderBy(orderBy?: string) {
    if (!orderBy) {
      return { id: "asc" };
    }

    const [field, direction = "asc"] = orderBy.split(":");

    if (!field) {
      throw new BadRequestException("orderBy must include a field");
    }

    if (!["asc", "desc"].includes(direction)) {
      throw new BadRequestException("orderBy direction must be asc or desc");
    }

    return { [field]: direction };
  }

  private parseJsonObject(value: string | undefined, fieldName: string): WhereInput | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(value) as unknown;

      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("Expected JSON object");
      }

      return parsed as WhereInput;
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid JSON object`);
    }
  }
}
