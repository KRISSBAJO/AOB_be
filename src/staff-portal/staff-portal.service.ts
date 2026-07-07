import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  AttendanceStatus,
  EmployeeStatus,
  EmploymentType,
  NotificationChannel,
  NotificationType,
  Prisma,
  ServiceRequestStatus,
  ServiceLine,
  ShiftStatus,
  WorkOrderPhotoType,
  WorkOrderStatus,
} from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import {
  ClockInDto,
  ClockOutDto,
  PayrollSummaryQueryDto,
} from "./dto/staff-portal.dto";

type StaffEmployee = Prisma.EmployeeGetPayload<{
  include: ReturnType<StaffPortalService["employeeInclude"]>;
}>;

@Injectable()
export class StaffPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(workspaceId: string, user: AuthenticatedUser) {
    const employee = await this.resolveEmployee(workspaceId, user);
    const today = this.startOfUtcDay(new Date());

    const [activeAttendance, todayAttendance] = await Promise.all([
      this.prisma.attendance.findFirst({
        where: { workspaceId, employeeId: employee.id, clockOutAt: null },
        orderBy: { clockInAt: "desc" },
        include: this.attendanceInclude(),
      }),
      this.prisma.attendance.findMany({
        where: { workspaceId, employeeId: employee.id, date: today },
        orderBy: { clockInAt: "desc" },
        include: this.attendanceInclude(),
      }),
    ]);

    return {
      employee,
      activeAttendance,
      todayAttendance,
      payPeriod: this.currentTwoDayPeriod(),
    };
  }

  async clockIn(workspaceId: string, user: AuthenticatedUser, dto: ClockInDto) {
    const employee = await this.resolveEmployee(workspaceId, user);

    return this.prisma.$transaction(async (tx) => {
      const open = await tx.attendance.findFirst({
        where: { workspaceId, employeeId: employee.id, clockOutAt: null },
      });

      if (open) {
        throw new BadRequestException("You are already clocked in");
      }

      const shift = await this.assertAssignedShift(
        tx,
        workspaceId,
        employee.id,
        dto.shiftId,
      );
      const workOrderId = dto.workOrderId ?? shift?.workOrderId ?? undefined;
      const workOrder = await this.assertAssignedWorkOrder(
        tx,
        workspaceId,
        employee.id,
        workOrderId,
      );
      const now = new Date();

      const attendance = await tx.attendance.create({
        data: {
          workspaceId,
          employeeId: employee.id,
          shiftId: shift?.id,
          workOrderId: workOrder?.id,
          date: this.startOfUtcDay(now),
          clockInAt: now,
          clockInLatitude: dto.latitude,
          clockInLongitude: dto.longitude,
          status: AttendanceStatus.PRESENT,
          notes: this.clean(dto.notes),
        },
        include: this.attendanceInclude(),
      });

      if (
        shift &&
        new Set<ShiftStatus>([
          ShiftStatus.SCHEDULED,
          ShiftStatus.CONFIRMED,
        ]).has(shift.status)
      ) {
        await tx.shift.update({
          where: { id: shift.id },
          data: { status: ShiftStatus.IN_PROGRESS },
        });
      }

      if (workOrder) {
        await tx.workOrderAssignment.updateMany({
          where: {
            workspaceId,
            employeeId: employee.id,
            workOrderId: workOrder.id,
          },
          data: {
            acceptedAt: now,
            startedAt: now,
          },
        });

        if (
          new Set<WorkOrderStatus>([
            WorkOrderStatus.CREATED,
            WorkOrderStatus.SCHEDULED,
            WorkOrderStatus.ASSIGNED,
            WorkOrderStatus.DISPATCHED,
            WorkOrderStatus.PAUSED,
          ]).has(workOrder.status)
        ) {
          await tx.workOrder.update({
            where: { id: workOrder.id },
            data: {
              status: WorkOrderStatus.IN_PROGRESS,
              startedAt: workOrder.startedAt ?? now,
            },
          });

          await tx.workOrderStatusHistory.create({
            data: {
              workspaceId,
              workOrderId: workOrder.id,
              fromStatus: workOrder.status,
              toStatus: WorkOrderStatus.IN_PROGRESS,
              changedById: user.id,
              note: `${employee.firstName} ${employee.lastName} clocked in`,
            },
          });
        }

        await this.updateServiceRequestFromWorkOrder(
          tx,
          workspaceId,
          user.id,
          workOrder.serviceRequestId,
          ServiceRequestStatus.IN_PROGRESS,
          `${employee.firstName} ${employee.lastName} started field work`,
        );
      }

      return attendance;
    });
  }

  async clockOut(
    workspaceId: string,
    user: AuthenticatedUser,
    dto: ClockOutDto,
  ) {
    const employee = await this.resolveEmployee(workspaceId, user);

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findFirst({
        where: dto.attendanceId
          ? { id: dto.attendanceId, workspaceId, employeeId: employee.id }
          : { workspaceId, employeeId: employee.id, clockOutAt: null },
        orderBy: { clockInAt: "desc" },
        include: { workOrder: true },
      });

      if (!attendance || attendance.clockOutAt) {
        throw new BadRequestException("No active clock-in record was found");
      }

      const workOrderId =
        dto.workOrderId ?? attendance.workOrderId ?? undefined;
      const workOrder = await this.assertAssignedWorkOrder(
        tx,
        workspaceId,
        employee.id,
        workOrderId,
      );
      const now = new Date();
      const notes = [
        attendance.notes,
        this.clean(dto.notes),
        this.clean(dto.proofNotes),
      ]
        .filter(Boolean)
        .join("\n");

      const updatedAttendance = await tx.attendance.update({
        where: { id: attendance.id },
        data: {
          workOrderId: workOrder?.id ?? attendance.workOrderId,
          clockOutAt: now,
          clockOutLatitude: dto.latitude,
          clockOutLongitude: dto.longitude,
          notes: notes || undefined,
        },
        include: this.attendanceInclude(),
      });

      const proofPhotoUrls =
        dto.proofPhotoUrls?.map((url) => url.trim()).filter(Boolean) ?? [];
      if (workOrder && proofPhotoUrls.length) {
        await tx.workOrderPhoto.createMany({
          data: proofPhotoUrls.map((url, index) => ({
            workspaceId,
            workOrderId: workOrder.id,
            uploadedByUserId: user.id,
            uploadedByEmployeeId: employee.id,
            type: WorkOrderPhotoType.AFTER,
            url,
            notes:
              this.clean(dto.proofNotes) ?? `End-of-day proof ${index + 1}`,
          })),
        });
      }

      if (workOrder) {
        await tx.workOrderAssignment.updateMany({
          where: {
            workspaceId,
            employeeId: employee.id,
            workOrderId: workOrder.id,
          },
          data: { completedAt: now },
        });

        await tx.notification.create({
          data: {
            workspaceId,
            employeeId: employee.id,
            type: NotificationType.STAFF,
            channel: NotificationChannel.IN_APP,
            title: "Staff closeout submitted",
            body: `${employee.firstName} ${employee.lastName} submitted closeout proof for ${workOrder.workOrderNumber}.`,
          },
        });

        if (
          dto.completeWorkOrder &&
          workOrder.status !== WorkOrderStatus.COMPLETED
        ) {
          await tx.workOrder.update({
            where: { id: workOrder.id },
            data: {
              status: WorkOrderStatus.COMPLETED,
              completedAt: now,
            },
          });

          await tx.workOrderStatusHistory.create({
            data: {
              workspaceId,
              workOrderId: workOrder.id,
              fromStatus: workOrder.status,
              toStatus: WorkOrderStatus.COMPLETED,
              changedById: user.id,
              note: "Completed from staff clock-out closeout",
            },
          });

          await this.updateServiceRequestFromWorkOrder(
            tx,
            workspaceId,
            user.id,
            workOrder.serviceRequestId,
            ServiceRequestStatus.COMPLETED,
            `Completed through work order ${workOrder.workOrderNumber}`,
          );
        }
      }

      return {
        attendance: updatedAttendance,
        proofPhotosCreated: proofPhotoUrls.length,
      };
    });
  }

  async payrollSummary(workspaceId: string, query: PayrollSummaryQueryDto) {
    const period = this.resolvePayrollPeriod(query);

    const records = await this.prisma.attendance.findMany({
      where: {
        workspaceId,
        date: {
          gte: period.from,
          lt: period.to,
        },
      },
      orderBy: [{ employeeId: "asc" }, { clockInAt: "asc" }],
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            hourlyRate: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, title: true } },
          },
        },
        shift: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
        workOrder: { select: { id: true, workOrderNumber: true, title: true } },
      },
    });

    const employees = new Map<
      string,
      {
        employee: (typeof records)[number]["employee"];
        minutes: number;
        hours: number;
        hourlyRate: number;
        grossPay: number;
        openRecords: number;
        records: Array<
          (typeof records)[number] & {
            minutes: number;
            hours: number;
            grossPay: number;
          }
        >;
      }
    >();

    for (const record of records) {
      const minutes = this.minutesBetween(record.clockInAt, record.clockOutAt);
      const hours = this.round2(minutes / 60);
      const hourlyRate = Number(record.employee.hourlyRate ?? 0);
      const grossPay = this.round2(hours * hourlyRate);
      const current = employees.get(record.employeeId) ?? {
        employee: record.employee,
        minutes: 0,
        hours: 0,
        hourlyRate,
        grossPay: 0,
        openRecords: 0,
        records: [],
      };

      current.minutes += minutes;
      current.hours = this.round2(current.minutes / 60);
      current.grossPay = this.round2(current.grossPay + grossPay);
      current.openRecords += record.clockInAt && !record.clockOutAt ? 1 : 0;
      current.records.push({ ...record, minutes, hours, grossPay });
      employees.set(record.employeeId, current);
    }

    const rows = Array.from(employees.values()).sort((a, b) =>
      `${a.employee.lastName} ${a.employee.firstName}`.localeCompare(
        `${b.employee.lastName} ${b.employee.firstName}`,
      ),
    );

    return {
      period: {
        from: period.from,
        to: period.to,
        payPeriodDays: 2,
      },
      totals: {
        employees: rows.length,
        hours: this.round2(rows.reduce((sum, row) => sum + row.hours, 0)),
        grossPay: this.round2(rows.reduce((sum, row) => sum + row.grossPay, 0)),
        openRecords: rows.reduce((sum, row) => sum + row.openRecords, 0),
      },
      employees: rows,
    };
  }

  private async resolveEmployee(
    workspaceId: string,
    user: AuthenticatedUser,
  ): Promise<StaffEmployee> {
    const byUser = await this.prisma.employee.findFirst({
      where: {
        workspaceId,
        userId: user.id,
        status: { not: EmployeeStatus.TERMINATED },
      },
      include: this.employeeInclude(),
    });

    if (byUser) {
      return byUser;
    }

    const byEmail = await this.prisma.employee.findFirst({
      where: {
        workspaceId,
        email: user.email,
        status: { not: EmployeeStatus.TERMINATED },
      },
      include: this.employeeInclude(),
    });

    if (!byEmail) {
      const ownerProfile = await this.createOwnerEmployeeIfNeeded(workspaceId, user);

      if (ownerProfile) {
        return ownerProfile;
      }

      throw new ForbiddenException(
        "Your user account is not linked to an active employee profile",
      );
    }

    if (byEmail.userId && byEmail.userId !== user.id) {
      throw new ForbiddenException(
        "This employee profile is already linked to another user",
      );
    }

    if (!byEmail.userId) {
      await this.prisma.employee.update({
        where: { id: byEmail.id },
        data: { userId: user.id },
      });
    }

    return byEmail;
  }

  private async createOwnerEmployeeIfNeeded(
    workspaceId: string,
    user: AuthenticatedUser,
  ): Promise<StaffEmployee | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: user.id, isActive: true },
      select: { id: true },
    });

    if (!workspace) {
      return null;
    }

    const current = await this.prisma.employee.findFirst({
      where: { workspaceId, userId: user.id },
      include: this.employeeInclude(),
    });

    if (current) {
      return current;
    }

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, phone: true },
    });
    const employeeNumber = await this.generateEmployeeNumber(workspaceId);
    const name = this.ownerEmployeeName(fullUser?.displayName ?? user.email, user.email);

    return this.prisma.employee.create({
      data: {
        workspaceId,
        userId: user.id,
        employeeNumber,
        ...name,
        email: user.email,
        phone: fullUser?.phone,
        employmentType: EmploymentType.FULL_TIME,
        serviceLines: [ServiceLine.OTHER],
        notes: "Workspace owner employee profile.",
      },
      include: this.employeeInclude(),
    });
  }

  private employeeInclude() {
    return {
      department: { select: { id: true, name: true, type: true } },
      position: { select: { id: true, title: true } },
      workOrderAssignments: {
        where: {
          completedAt: null,
          workOrder: {
            status: {
              notIn: [
                WorkOrderStatus.COMPLETED,
                WorkOrderStatus.CANCELLED,
                WorkOrderStatus.CUSTOMER_APPROVED,
              ],
            },
          },
        },
        include: {
          workOrder: {
            select: {
              id: true,
              workOrderNumber: true,
              title: true,
              status: true,
              scheduledStartAt: true,
              scheduledEndAt: true,
              facility: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" as const },
        take: 20,
      },
      shiftAssignments: {
        where: {
          status: { not: ShiftStatus.CANCELLED },
          shift: { endAt: { gte: new Date() } },
        },
        include: {
          shift: {
            select: {
              id: true,
              title: true,
              status: true,
              startAt: true,
              endAt: true,
              workOrderId: true,
              facility: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" as const },
        take: 20,
      },
    };
  }

  private attendanceInclude() {
    return {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
      shift: { select: { id: true, title: true, startAt: true, endAt: true } },
      workOrder: {
        select: { id: true, workOrderNumber: true, title: true, status: true },
      },
    };
  }

  private async assertAssignedShift(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    employeeId: string,
    shiftId?: string,
  ) {
    if (!shiftId) return null;

    const shift = await tx.shift.findFirst({
      where: { id: shiftId, workspaceId },
      include: { assignments: { where: { employeeId } } },
    });

    if (!shift || !shift.assignments.length) {
      throw new ForbiddenException("You are not assigned to this shift");
    }

    return shift;
  }

  private async assertAssignedWorkOrder(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    employeeId: string,
    workOrderId?: string,
  ) {
    if (!workOrderId) return null;

    const assignment = await tx.workOrderAssignment.findFirst({
      where: { workspaceId, employeeId, workOrderId },
      include: {
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            title: true,
            status: true,
            startedAt: true,
            serviceRequestId: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException("You are not assigned to this work order");
    }

    return assignment.workOrder;
  }

  private async updateServiceRequestFromWorkOrder(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
    serviceRequestId: string | null,
    status: ServiceRequestStatus,
    note: string,
  ) {
    if (!serviceRequestId) return;

    const serviceRequest = await tx.serviceRequest.findFirst({
      where: { id: serviceRequestId, workspaceId },
      select: { id: true, status: true },
    });

    if (!serviceRequest || serviceRequest.status === status) return;

    await tx.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: {
        status,
        completedAt:
          status === ServiceRequestStatus.COMPLETED ? new Date() : undefined,
      },
    });

    await tx.serviceRequestStatusHistory.create({
      data: {
        workspaceId,
        serviceRequestId: serviceRequest.id,
        fromStatus: serviceRequest.status,
        toStatus: status,
        changedById: userId,
        note,
      },
    });
  }

  private resolvePayrollPeriod(query: PayrollSummaryQueryDto) {
    if (query.from || query.to) {
      const from = query.from
        ? this.startOfUtcDay(new Date(query.from))
        : this.currentTwoDayPeriod().from;
      const to = query.to
        ? this.addDays(this.startOfUtcDay(new Date(query.to)), 1)
        : this.currentTwoDayPeriod().to;
      return { from, to };
    }

    return this.currentTwoDayPeriod();
  }

  private currentTwoDayPeriod() {
    const now = this.startOfUtcDay(new Date());
    const epoch = Date.UTC(2026, 0, 1);
    const daysSinceEpoch = Math.floor((now.getTime() - epoch) / 86_400_000);
    const periodStart = this.addDays(
      new Date(epoch),
      Math.floor(daysSinceEpoch / 2) * 2,
    );

    return {
      from: periodStart,
      to: this.addDays(periodStart, 2),
    };
  }

  private startOfUtcDay(value: Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private minutesBetween(clockInAt?: Date | null, clockOutAt?: Date | null) {
    if (!clockInAt || !clockOutAt || clockOutAt <= clockInAt) return 0;
    return Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60_000);
  }

  private round2(value: number) {
    return Math.round(value * 100) / 100;
  }

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
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

  private async generateEmployeeNumber(workspaceId: string) {
    const count = await this.prisma.employee.count({ where: { workspaceId } });
    return `EMP-${String(count + 1).padStart(5, "0")}`;
  }
}
