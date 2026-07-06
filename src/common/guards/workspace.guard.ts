import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/authenticated-user";

type WorkspaceRequest = Request & {
  user?: AuthenticatedUser;
  workspaceId?: string;
};

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const user = request.user;
    const workspaceId =
      request.header("x-workspace-id") ??
      (typeof request.query.workspaceId === "string" ? request.query.workspaceId : undefined);

    if (!user) {
      throw new ForbiddenException("Authenticated user required");
    }

    if (!workspaceId) {
      throw new ForbiddenException("x-workspace-id header or workspaceId query is required");
    }

    if (!user.isSiteAdmin) {
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

    request.workspaceId = workspaceId;
    return true;
  }
}

