import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { EmploymentType, ServiceLine, WorkspaceRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { toSlug } from "../common/utils/slug";
import { createOpaqueToken, hashToken } from "../common/utils/token";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignUpDto } from "./dto/sign-up.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async signUp(dto: SignUpDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const permissions = await this.permissionsService.seedDefaults();
    const slug = await this.createUniqueWorkspaceSlug(dto.workspaceName);

    const { user, workspace } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName.trim(),
          phone: dto.phone,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: dto.workspaceName.trim(),
          slug,
          ownerId: user.id,
        },
      });

      await tx.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: WorkspaceRole.OWNER,
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          workspaceId: workspace.id,
          name: "Owner",
          description: "Full workspace access",
          isSystem: true,
        },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: ownerRole.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });

      await tx.userRole.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      await tx.employee.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          employeeNumber: "EMP-00001",
          ...this.ownerEmployeeName(dto.displayName, email),
          email,
          phone: dto.phone,
          employmentType: EmploymentType.FULL_TIME,
          serviceLines: [ServiceLine.OTHER],
          notes: "Workspace owner employee profile.",
        },
      });

      return { user, workspace };
    });

    return this.withTokens(user, workspace.id);
  }

  async signIn(dto: SignInDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.withTokens(user, user.memberships[0]?.workspaceId);
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const secret = this.getRefreshSecret();
    let payload: { sub: string; sid: string; type: string };

    try {
      payload = this.jwtService.verify(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    const presentedTokenHash = hashToken(refreshToken);

    if (session?.revokedAt && session.tokenHash === presentedTokenHash) {
      await this.prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.tokenHash !== presentedTokenHash
    ) {
      throw new UnauthorizedException("Refresh session is no longer valid");
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const membership = await this.prisma.workspaceMembership.findFirst({
      where: { userId: session.userId },
      orderBy: { joinedAt: "asc" },
    });

    return this.withTokens(session.user, membership?.workspaceId);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const payload = this.jwtService.verify<{ sid: string }>(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      await this.prisma.refreshSession.updateMany({
        where: {
          id: payload.sid,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } catch {
      return { success: true };
    }

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: "If an account exists, a reset link has been sent." };
    }

    const token = createOpaqueToken();
    const ttlMinutes = this.configService.get<number>("PASSWORD_RESET_TTL_MINUTES", 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    return {
      message: "If an account exists, a reset link has been sent.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : token,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, 12) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          include: { workspace: true },
          orderBy: { joinedAt: "asc" },
        },
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    return this.serializeUser(user);
  }

  private async withTokens(
    user: { id: string; email: string; displayName: string; isSiteAdmin: boolean },
    activeWorkspaceId?: string,
  ) {
    const accessTtlSeconds = this.configService.get<number>("JWT_ACCESS_TTL_SECONDS", 3600);
    const refreshExpiresAt = this.refreshExpiry();

    const session = await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: "pending",
        expiresAt: refreshExpiresAt,
      },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        isSiteAdmin: user.isSiteAdmin,
      },
      {
        secret: this.getAccessSecret(),
        expiresIn: accessTtlSeconds,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sid: session.id,
        type: "refresh",
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: `${this.configService.get<number>("JWT_REFRESH_TTL_DAYS", 45)}d`,
      },
    );

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { tokenHash: hashToken(refreshToken) },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + accessTtlSeconds * 1000),
      refreshTokenExpiresAt: refreshExpiresAt,
      user: this.serializeUser(user),
      activeWorkspaceId,
    };
  }

  private serializeUser(user: Record<string, unknown>) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private getAccessSecret() {
    const secret = this.configService.get<string>("JWT_SECRET");

    if (!secret) {
      throw new UnauthorizedException("JWT_SECRET is not configured");
    }

    return secret;
  }

  private getRefreshSecret() {
    const secret =
      this.configService.get<string>("JWT_REFRESH_SECRET") ??
      this.configService.get<string>("JWT_SECRET");

    if (!secret) {
      throw new UnauthorizedException("JWT_REFRESH_SECRET is not configured");
    }

    return secret;
  }

  private refreshExpiry() {
    const days = this.configService.get<number>("JWT_REFRESH_TTL_DAYS", 45);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
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

  private ownerEmployeeName(displayName: string, email: string) {
    const cleaned = displayName.trim();
    const fallback = email.split("@")[0] || "Owner";
    const [firstName, ...lastNameParts] = cleaned ? cleaned.split(/\s+/) : [fallback];

    return {
      firstName: firstName || fallback,
      lastName: lastNameParts.join(" ") || "Owner",
    };
  }
}
