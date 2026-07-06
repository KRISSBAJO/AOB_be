import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  list(workspaceId: string) {
    return this.prisma.role.findMany({
      where: { workspaceId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        permissions: {
          include: { permission: true },
          orderBy: { permission: { code: "asc" } },
        },
      },
    });
  }

  async create(workspaceId: string, dto: CreateRoleDto) {
    const permissions = dto.permissions?.length
      ? await this.prisma.permission.findMany({
          where: { code: { in: dto.permissions } },
        })
      : [];

    if ((dto.permissions?.length ?? 0) !== permissions.length) {
      throw new BadRequestException("One or more permission codes are invalid");
    }

    return this.prisma.role.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        description: dto.description,
        permissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  update(id: string, dto: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id },
      data: dto,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  remove(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }

  async addPermission(roleId: string, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });

    if (!permission) {
      throw new BadRequestException("Invalid permission code");
    }

    return this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permission.id,
        },
      },
      create: {
        roleId,
        permissionId: permission.id,
      },
      update: {},
      include: { permission: true },
    });
  }

  async removePermission(roleId: string, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });

    if (!permission) {
      throw new BadRequestException("Invalid permission code");
    }

    return this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permission.id,
        },
      },
    });
  }
}

