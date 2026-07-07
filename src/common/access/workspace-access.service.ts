import { ForbiddenException, Injectable } from "@nestjs/common";
import { ContactRole, Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../auth/authenticated-user";
import { PrismaService } from "../../prisma/prisma.service";

export type WorkspaceAccessScope = {
  userId: string;
  unrestricted: boolean;
  roleNames: Set<string>;
  employeeId?: string;
  customerContactId?: string;
  customerId?: string;
  contactRole?: ContactRole;
  facilityIds: string[];
};

const UNRESTRICTED_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getScope(
    workspaceId: string,
    user: AuthenticatedUser,
  ): Promise<WorkspaceAccessScope> {
    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        memberships: {
          where: { workspaceId },
          select: { role: true },
        },
        userRoles: {
          where: { workspaceId },
          include: { role: { select: { name: true } } },
        },
        employeeProfile: {
          select: { id: true, workspaceId: true },
        },
        customerContactProfile: {
          select: {
            id: true,
            workspaceId: true,
            customerId: true,
            role: true,
            facilityContacts: { select: { facilityId: true } },
          },
        },
      },
    });

    const roleNames = new Set<string>();
    profile.memberships.forEach((membership) => roleNames.add(membership.role));
    profile.userRoles.forEach((assignment) =>
      roleNames.add(assignment.role.name.toUpperCase()),
    );

    const unrestricted =
      user.isSiteAdmin ||
      [...roleNames].some((role) => UNRESTRICTED_ROLES.has(role));
    const contact =
      profile.customerContactProfile?.workspaceId === workspaceId
        ? profile.customerContactProfile
        : undefined;
    const employee =
      profile.employeeProfile?.workspaceId === workspaceId
        ? profile.employeeProfile
        : undefined;

    return {
      userId: user.id,
      unrestricted,
      roleNames,
      employeeId: employee?.id,
      customerContactId: contact?.id,
      customerId: contact?.customerId,
      contactRole: contact?.role,
      facilityIds:
        contact?.facilityContacts.map((facility) => facility.facilityId) ?? [],
    };
  }

  assertUnrestricted(scope: WorkspaceAccessScope) {
    if (!scope.unrestricted) {
      throw new ForbiddenException("This action requires AOG manager access");
    }
  }

  customerWhere(scope: WorkspaceAccessScope): Prisma.CustomerWhereInput {
    if (scope.unrestricted) return {};
    if (scope.customerId) return { id: scope.customerId };
    return { id: "__no_customer_access__" };
  }

  facilityWhere(scope: WorkspaceAccessScope): Prisma.FacilityWhereInput {
    if (scope.unrestricted) return {};
    if (scope.facilityIds.length) return { id: { in: scope.facilityIds } };
    if (scope.customerId) return { customerId: scope.customerId };
    return { id: "__no_facility_access__" };
  }

  serviceRequestWhere(scope: WorkspaceAccessScope): Prisma.ServiceRequestWhereInput {
    if (scope.unrestricted) return {};
    if (scope.customerContactId || scope.customerId) {
      const or: Prisma.ServiceRequestWhereInput[] = [];
      if (scope.customerContactId) {
        or.push({ requestedByContactId: scope.customerContactId });
      }
      if (scope.facilityIds.length) {
        or.push({ facilityId: { in: scope.facilityIds } });
      }
      if (scope.customerId) {
        or.push({ customerId: scope.customerId });
      }
      return or.length ? { OR: or } : { id: "__no_request_access__" };
    }
    if (scope.employeeId) {
      return {
        workOrders: {
          some: {
            OR: [
              { supervisorEmployeeId: scope.employeeId },
              { assignments: { some: { employeeId: scope.employeeId } } },
            ],
          },
        },
      };
    }
    return { id: "__no_request_access__" };
  }

  workOrderWhere(scope: WorkspaceAccessScope): Prisma.WorkOrderWhereInput {
    if (scope.unrestricted) return {};
    if (scope.employeeId) {
      return {
        OR: [
          { supervisorEmployeeId: scope.employeeId },
          { assignments: { some: { employeeId: scope.employeeId } } },
        ],
      };
    }
    if (scope.customerId) {
      const or: Prisma.WorkOrderWhereInput[] = [{ customerId: scope.customerId }];
      if (scope.facilityIds.length) {
        or.unshift({ facilityId: { in: scope.facilityIds } });
      }
      return { OR: or };
    }
    return { id: "__no_work_order_access__" };
  }

  shiftWhere(scope: WorkspaceAccessScope): Prisma.ShiftWhereInput {
    if (scope.unrestricted) return {};
    if (scope.employeeId) {
      return { assignments: { some: { employeeId: scope.employeeId } } };
    }
    if (scope.facilityIds.length) return { facilityId: { in: scope.facilityIds } };
    return { id: "__no_shift_access__" };
  }

  attendanceWhere(scope: WorkspaceAccessScope): Prisma.AttendanceWhereInput {
    if (scope.unrestricted) return {};
    if (scope.employeeId) return { employeeId: scope.employeeId };
    return { id: "__no_attendance_access__" };
  }

  leaveRequestWhere(scope: WorkspaceAccessScope): Prisma.LeaveRequestWhereInput {
    if (scope.unrestricted) return {};
    if (scope.employeeId) return { employeeId: scope.employeeId };
    return { id: "__no_leave_access__" };
  }

  conversationWhere(scope: WorkspaceAccessScope): Prisma.ConversationWhereInput {
    if (scope.unrestricted) return {};

    return {
      OR: [
        { participants: { some: { userId: scope.userId } } },
        ...this.optionalConversationAccess(scope),
      ],
    };
  }

  private optionalConversationAccess(
    scope: WorkspaceAccessScope,
  ): Prisma.ConversationWhereInput[] {
    const or: Prisma.ConversationWhereInput[] = [];
    if (scope.employeeId) {
      or.push(
        { participants: { some: { employeeId: scope.employeeId } } },
        {
          workOrder: {
            OR: [
              { supervisorEmployeeId: scope.employeeId },
              { assignments: { some: { employeeId: scope.employeeId } } },
            ],
          },
        },
      );
    }
    if (scope.customerContactId) {
      or.push({
        participants: {
          some: { customerContactId: scope.customerContactId },
        },
      });
    }
    if (scope.customerId) {
      or.push({ customerId: scope.customerId });
    }
    if (scope.facilityIds.length) {
      or.push({ facilityId: { in: scope.facilityIds } });
    }
    return or;
  }

  ownFileWhere(scope: WorkspaceAccessScope): Prisma.AttachmentWhereInput {
    if (scope.unrestricted) return {};
    return { uploadedById: scope.userId };
  }

  ownCommentWhere(scope: WorkspaceAccessScope): Prisma.CommentWhereInput {
    if (scope.unrestricted) return {};
    return { authorUserId: scope.userId, internalOnly: false };
  }

  employeeWhere(scope: WorkspaceAccessScope): Prisma.EmployeeWhereInput {
    if (scope.unrestricted) return {};
    if (scope.employeeId) return { id: scope.employeeId };
    return { id: "__no_employee_access__" };
  }

  canManageCustomerFacility(scope: WorkspaceAccessScope) {
    return (
      scope.unrestricted ||
      scope.contactRole === ContactRole.OWNER ||
      scope.contactRole === ContactRole.ADMIN ||
      scope.contactRole === ContactRole.FACILITY_MANAGER
    );
  }
}
