import { ForbiddenException, Injectable } from "@nestjs/common";
import { WorkspaceRole } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { toSlug } from "../common/utils/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { CreateMembershipDto, UpdateMembershipDto } from "./dto/membership.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthenticatedUser) {
    if (user.isSiteAdmin) {
      return this.prisma.workspace.findMany({
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { id: true, email: true, displayName: true } } },
      });
    }

    return this.prisma.workspace.findMany({
      where: { memberships: { some: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = await this.createUniqueWorkspaceSlug(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description,
          supportEmail: dto.supportEmail,
          ownerId: userId,
        },
      });

      await tx.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
        },
      });

      return workspace;
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.assertMembership(user, id);

    return this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, email: true, displayName: true, status: true } },
          },
        },
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateWorkspaceDto) {
    await this.assertOwnerOrAdmin(user, id);

    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertOwnerOrAdmin(user, id);

    return this.prisma.workspace.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addMember(user: AuthenticatedUser, workspaceId: string, dto: CreateMembershipDto) {
    await this.assertOwnerOrAdmin(user, workspaceId);

    return this.prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dto.userId,
        },
      },
      create: {
        workspaceId,
        userId: dto.userId,
        role: dto.role,
      },
      update: { role: dto.role },
      include: {
        user: { select: { id: true, email: true, displayName: true, status: true } },
      },
    });
  }

  async updateMember(
    user: AuthenticatedUser,
    workspaceId: string,
    memberId: string,
    dto: UpdateMembershipDto,
  ) {
    await this.assertOwnerOrAdmin(user, workspaceId);

    return this.prisma.workspaceMembership.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  async removeMember(user: AuthenticatedUser, workspaceId: string, memberId: string) {
    await this.assertOwnerOrAdmin(user, workspaceId);

    return this.prisma.workspaceMembership.delete({
      where: { id: memberId },
    });
  }

  private async assertMembership(user: AuthenticatedUser, workspaceId: string) {
    if (user.isSiteAdmin) return;

    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException("User is not a member of this workspace");
    }
  }

  private async assertOwnerOrAdmin(user: AuthenticatedUser, workspaceId: string) {
    if (user.isSiteAdmin) return;

    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    const elevatedRoles: WorkspaceRole[] = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

    if (!membership || !elevatedRoles.includes(membership.role)) {
      throw new ForbiddenException("Workspace owner or admin role is required");
    }
  }

  private async createUniqueWorkspaceSlug(name: string) {
    const base = toSlug(name);
    let slug = base;
    let suffix = 1;

    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }

    return slug;
  }
}
