import { ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, query: ListUsersQueryDto) {
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);
    const where = {
      deletedAt: null,
      ...(query.workspaceId && !user.isSiteAdmin
        ? { memberships: { some: { workspaceId: query.workspaceId } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" as const } },
              { displayName: { contains: query.search, mode: "insensitive" as const } },
              { phone: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: this.safeSelect(),
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        displayName: dto.displayName.trim(),
        phone: dto.phone,
        isSiteAdmin: Boolean(dto.isSiteAdmin),
      },
      select: this.safeSelect(),
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: this.safeSelect(),
    });
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.safeSelect(),
    });
  }

  softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
      },
      select: this.safeSelect(),
    });
  }

  private safeSelect() {
    return {
      id: true,
      email: true,
      displayName: true,
      phone: true,
      avatarUrl: true,
      status: true,
      isSiteAdmin: true,
      lastLoginAt: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}

