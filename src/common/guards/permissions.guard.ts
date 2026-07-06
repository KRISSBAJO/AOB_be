import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/authenticated-user";
import { REQUIRED_PERMISSIONS_KEY } from "../decorators/permissions.decorator";

type PermissionRequest = Request & {
  user?: AuthenticatedUser;
  workspaceId?: string;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PermissionRequest>();
    const user = request.user;
    const workspaceId =
      request.workspaceId ??
      request.header("x-workspace-id") ??
      (typeof request.query.workspaceId === "string" ? request.query.workspaceId : undefined);

    if (!user) {
      throw new ForbiddenException("Authenticated user required");
    }

    if (user.isSiteAdmin) {
      return true;
    }

    if (!workspaceId) {
      throw new ForbiddenException("Workspace context is required");
    }

    const matches = await this.prisma.userRole.count({
      where: {
        userId: user.id,
        workspaceId,
        role: {
          permissions: {
            some: {
              permission: {
                code: {
                  in: required,
                },
              },
            },
          },
        },
      },
    });

    if (matches < required.length) {
      throw new ForbiddenException("Missing required permission");
    }

    return true;
  }
}

