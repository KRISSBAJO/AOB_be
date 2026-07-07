import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  BackgroundJobStatus,
  BackgroundJobType,
  ContactRole,
  EmploymentType,
  NotificationChannel,
  NotificationType,
  ServiceLine,
  UserStatus,
  WorkspaceRole,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { toSlug } from "../common/utils/slug";
import { createOpaqueToken, hashToken } from "../common/utils/token";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { InviteUserDto } from "./dto/invite-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignUpDto } from "./dto/sign-up.dto";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ["*"],
  ADMIN: ["*"],
  MANAGER: [
    "customers.manage",
    "facilities.manage",
    "services.manage",
    "contracts.manage",
    "operations.manage",
    "workforce.manage",
    "qa.manage",
    "billing.manage",
    "reports.read",
  ],
  STAFF: ["operations.manage"],
  FACILITY_MANAGER: ["facilities.manage", "operations.manage"],
  CLIENT_CONTACT: ["operations.manage"],
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async signUp(dto: SignUpDto) {
    await this.assertPublicSignupAllowed();
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

  async getInvitation(token: string) {
    const record = await this.getValidInviteRecord(token);
    const workspaceId = record.user.memberships[0]?.workspaceId;
    const workspace = workspaceId
      ? await this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true, name: true, slug: true },
        })
      : null;

    return {
      email: record.user.email,
      displayName: record.user.displayName,
      phone: record.user.phone,
      status: record.user.status,
      workspace,
      customerContact: record.user.customerContactProfile
        ? {
            id: record.user.customerContactProfile.id,
            customerId: record.user.customerContactProfile.customerId,
            customerName: record.user.customerContactProfile.customer.name,
            role: record.user.customerContactProfile.role,
          }
        : null,
      employee: record.user.employeeProfile
        ? {
            id: record.user.employeeProfile.id,
            employeeNumber: record.user.employeeProfile.employeeNumber,
            firstName: record.user.employeeProfile.firstName,
            lastName: record.user.employeeProfile.lastName,
          }
        : null,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const record = await this.getValidInviteRecord(dto.token);
    const displayName = dto.displayName?.trim() || record.user.displayName;
    const phone = dto.phone?.trim() || record.user.phone;
    const workspaceId = record.user.memberships[0]?.workspaceId;

    if (!workspaceId) {
      throw new UnauthorizedException("Invitation is not linked to a workspace");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          displayName,
          phone,
          status: UserStatus.ACTIVE,
        },
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

    return this.withTokens(user, workspaceId);
  }

  async inviteCustomerContact(workspaceId: string, contactId: string, dto: InviteUserDto = {}) {
    const contact = await this.prisma.customerContact.findFirstOrThrow({
      where: { id: contactId, workspaceId },
      include: { customer: { select: { id: true, name: true } }, workspace: true },
    });

    if (!contact.email) {
      throw new BadRequestException("Contact email is required before sending portal access");
    }

    const roleName = this.contactPortalRole(contact.role);
    const displayName = `${contact.firstName} ${contact.lastName}`.trim();

    const invite = await this.createInvitation({
      workspaceId,
      email: contact.email,
      displayName,
      phone: contact.phone,
      roleName,
      membershipRole: WorkspaceRole.VIEWER,
      dto,
      linkProfile: async (userId) => {
        await this.prisma.customerContact.update({
          where: { id: contact.id },
          data: { userId, canLogin: true },
        });
      },
      notificationTitle: "Client portal invitation sent",
      notificationBody: `${displayName} can now accept access for ${contact.customer.name}.`,
    });

    return {
      ...invite,
      target: "CUSTOMER_CONTACT",
      contactId: contact.id,
      customerId: contact.customerId,
      customerName: contact.customer.name,
    };
  }

  async inviteEmployee(workspaceId: string, employeeId: string, dto: InviteUserDto = {}) {
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: { id: employeeId, workspaceId },
      include: { workspace: true },
    });

    if (!employee.email) {
      throw new BadRequestException("Employee email is required before sending portal access");
    }

    const displayName = `${employee.firstName} ${employee.lastName}`.trim();
    const invite = await this.createInvitation({
      workspaceId,
      email: employee.email,
      displayName,
      phone: employee.phone,
      roleName: "STAFF",
      membershipRole: WorkspaceRole.MEMBER,
      dto,
      linkProfile: async (userId) => {
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: { userId },
        });
      },
      notificationTitle: "Staff portal invitation sent",
      notificationBody: `${displayName} can now accept staff access and use the time clock.`,
    });

    return {
      ...invite,
      target: "EMPLOYEE",
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
    };
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

  private async assertPublicSignupAllowed() {
    const allowPublicSignup =
      this.configService.get<string>("ALLOW_PUBLIC_SIGN_UP") === "true";
    if (allowPublicSignup) return;

    const existingUsers = await this.prisma.user.count();
    if (existingUsers === 0) return;

    throw new UnauthorizedException(
      "Public sign-up is disabled. Ask AOG Services to send an invite.",
    );
  }

  private async getValidInviteRecord(token: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          include: {
            memberships: {
              include: { workspace: true },
              orderBy: { joinedAt: "asc" },
            },
            customerContactProfile: {
              include: { customer: { select: { id: true, name: true } } },
            },
            employeeProfile: true,
          },
        },
      },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid or expired invitation");
    }

    return record;
  }

  private async createInvitation(input: {
    workspaceId: string;
    email: string;
    displayName: string;
    phone?: string | null;
    roleName: string;
    membershipRole: WorkspaceRole;
    dto: InviteUserDto;
    linkProfile: (userId: string) => Promise<void>;
    notificationTitle: string;
    notificationBody: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const token = createOpaqueToken();
    const ttlMinutes = this.configService.get<number>("PASSWORD_RESET_TTL_MINUTES", 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    const inviteUrl = this.inviteUrl(token, input.dto.redirectBaseUrl);
    const passwordHash = await bcrypt.hash(createOpaqueToken(), 12);
    const permissions = await this.permissionsService.seedDefaults();

    const result = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              displayName: input.displayName,
              phone: input.phone ?? undefined,
              status:
                existingUser.status === UserStatus.ACTIVE
                  ? UserStatus.ACTIVE
                  : UserStatus.INVITED,
            },
          })
        : await tx.user.create({
            data: {
              email,
              passwordHash,
              displayName: input.displayName,
              phone: input.phone ?? undefined,
              status: UserStatus.INVITED,
            },
          });

      await tx.workspaceMembership.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: user.id,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          userId: user.id,
          role: input.membershipRole,
        },
        update: { role: input.membershipRole },
      });

      await this.ensureWorkspaceRole(
        tx,
        input.workspaceId,
        input.roleName,
        permissions,
      );
      const role = await tx.role.findUniqueOrThrow({
        where: {
          workspaceId_name: {
            workspaceId: input.workspaceId,
            name: input.roleName,
          },
        },
      });

      await tx.userRole.upsert({
        where: {
          workspaceId_userId_roleId: {
            workspaceId: input.workspaceId,
            userId: user.id,
            roleId: role.id,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          userId: user.id,
          roleId: role.id,
        },
        update: {},
      });

      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const inviteToken = await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt,
        },
      });

      await tx.notification.create({
        data: {
          workspaceId: input.workspaceId,
          userId: user.id,
          type: NotificationType.SYSTEM,
          channel: NotificationChannel.IN_APP,
          title: "Portal invitation",
          body: "Your AOG Services portal invitation is ready.",
        },
      });

      await tx.notification.create({
        data: {
          workspaceId: input.workspaceId,
          type: NotificationType.SYSTEM,
          channel: NotificationChannel.IN_APP,
          title: input.notificationTitle,
          body: input.notificationBody,
        },
      });

      await tx.backgroundJob.create({
        data: {
          workspaceId: input.workspaceId,
          type: BackgroundJobType.EMAIL_DELIVERY,
          status: BackgroundJobStatus.QUEUED,
          payload: {
            template: "AOG_PORTAL_INVITE",
            ready: this.emailDeliveryConfigured(),
            requiresConfiguredMailer: !this.emailDeliveryConfigured(),
            to: email,
            subject: "Your AOG Services portal invitation",
            firstName: input.displayName.split(/\s+/)[0],
            inviteUrl,
          },
        },
      });

      return { user, inviteToken };
    });

    await input.linkProfile(result.user.id);

    return {
      email,
      displayName: input.displayName,
      role: input.roleName,
      inviteUrl,
      expiresAt,
      token: process.env.NODE_ENV === "production" ? undefined : token,
    };
  }

  private async ensureWorkspaceRole(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    roleName: string,
    permissions: Array<{ id: string; code: string }>,
  ) {
    const role = await tx.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: roleName,
        },
      },
      create: {
        workspaceId,
        name: roleName,
        description: `${roleName.replaceAll("_", " ").toLowerCase()} access`,
        isSystem: true,
      },
      update: { isSystem: true },
    });

    const permissionCodes = ROLE_PERMISSIONS[roleName] ?? [];
    const selectedPermissions = permissionCodes.includes("*")
      ? permissions
      : permissions.filter((permission) => permissionCodes.includes(permission.code));

    await tx.rolePermission.createMany({
      data: selectedPermissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  private contactPortalRole(role: ContactRole) {
    return role === ContactRole.FACILITY_MANAGER ||
      role === ContactRole.OWNER ||
      role === ContactRole.ADMIN
      ? "FACILITY_MANAGER"
      : "CLIENT_CONTACT";
  }

  private inviteUrl(token: string, redirectBaseUrl?: string) {
    const base =
      redirectBaseUrl?.replace(/\/$/, "") ||
      this.configService.get<string>("PUBLIC_APP_URL")?.replace(/\/$/, "") ||
      "http://localhost:3002";
    return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  private emailDeliveryConfigured() {
    return Boolean(
      this.configService.get<string>("EMAIL_FROM") &&
        (this.configService.get<string>("SMTP_HOST") ||
          this.configService.get<string>("MAIL_PROVIDER")),
    );
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
