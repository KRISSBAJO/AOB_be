import { BadRequestException, Injectable } from "@nestjs/common";
import { LeaveStatus, ShiftStatus } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListAttendanceQueryDto, ListLeaveRequestsQueryDto, ListShiftsQueryDto } from "./dto/scheduling-query.dto";
import {
  CreateAttendanceDto,
  CreateLeaveRequestDto,
  CreateShiftAssignmentDto,
  CreateShiftDto,
  ReviewLeaveRequestDto,
  UpdateAttendanceDto,
  UpdateLeaveRequestDto,
  UpdateShiftDto,
  UpdateShiftStatusDto,
} from "./dto/scheduling.dto";

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  async listShifts(workspaceId: string, query: ListShiftsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["title", "notes"]);
    const startAt = {
      ...(query.startFrom ? { gte: new Date(query.startFrom) } : {}),
      ...(query.startTo ? { lte: new Date(query.startTo) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.serviceLine ? { serviceLine: query.serviceLine } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(startAt).length ? { startAt } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        skip,
        take,
        orderBy: { startAt: "asc" },
        include: this.shiftInclude(),
      }),
      this.prisma.shift.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createShift(workspaceId: string, dto: CreateShiftDto) {
    this.assertDateRange(dto.startAt, dto.endAt);
    await this.assertFacility(workspaceId, dto.facilityId);
    await this.assertDepartment(workspaceId, dto.departmentId);
    await this.assertWorkOrder(workspaceId, dto.workOrderId);

    return this.prisma.shift.create({
      data: {
        ...dto,
        workspaceId,
        title: dto.title.trim(),
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
      include: this.shiftInclude(),
    });
  }

  async updateShift(workspaceId: string, id: string, dto: UpdateShiftDto) {
    const current = await this.prisma.shift.findFirstOrThrow({ where: { id, workspaceId } });
    this.assertDateRange(dto.startAt ?? current.startAt.toISOString(), dto.endAt ?? current.endAt.toISOString());
    await this.assertFacility(workspaceId, dto.facilityId);
    await this.assertDepartment(workspaceId, dto.departmentId);
    await this.assertWorkOrder(workspaceId, dto.workOrderId);

    return this.prisma.shift.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        title: dto.title?.trim(),
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
      include: this.shiftInclude(),
    });
  }

  updateShiftStatus(workspaceId: string, id: string, dto: UpdateShiftStatusDto) {
    return this.prisma.shift.update({
      where: { id, workspaceId },
      data: { status: dto.status },
      include: this.shiftInclude(),
    });
  }

  async addShiftAssignment(
    workspaceId: string,
    shiftId: string,
    dto: CreateShiftAssignmentDto,
  ) {
    const shift = await this.prisma.shift.findFirstOrThrow({ where: { id: shiftId, workspaceId } });
    await this.assertEmployee(workspaceId, dto.employeeId);
    await this.assertShiftAvailability(workspaceId, dto.employeeId, shift);

    return this.prisma.shiftAssignment.upsert({
      where: { shiftId_employeeId: { shiftId, employeeId: dto.employeeId } },
      create: {
        workspaceId,
        shiftId,
        employeeId: dto.employeeId,
        role: dto.role,
        status: dto.status,
        notes: dto.notes,
      },
      update: {
        role: dto.role,
        status: dto.status,
        notes: dto.notes,
        confirmedAt: dto.status === ShiftStatus.CONFIRMED ? new Date() : undefined,
        cancelledAt: dto.status === ShiftStatus.CANCELLED ? new Date() : undefined,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, status: true } } },
    });
  }

  async listAttendance(workspaceId: string, query: ListAttendanceQueryDto) {
    const { skip, take } = getPagination(query);
    const date = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(date).length ? { date } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          shift: { select: { id: true, title: true, startAt: true, endAt: true } },
          workOrder: { select: { id: true, workOrderNumber: true, title: true } },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createAttendance(workspaceId: string, dto: CreateAttendanceDto) {
    await this.assertEmployee(workspaceId, dto.employeeId);
    await this.assertShift(workspaceId, dto.shiftId);
    await this.assertWorkOrder(workspaceId, dto.workOrderId);
    this.assertClockRange(dto.clockInAt, dto.clockOutAt);

    return this.prisma.attendance.create({
      data: {
        ...dto,
        workspaceId,
        date: new Date(dto.date),
        clockInAt: dto.clockInAt ? new Date(dto.clockInAt) : undefined,
        clockOutAt: dto.clockOutAt ? new Date(dto.clockOutAt) : undefined,
      },
    });
  }

  async updateAttendance(workspaceId: string, id: string, dto: UpdateAttendanceDto) {
    await this.assertEmployee(workspaceId, dto.employeeId);
    await this.assertShift(workspaceId, dto.shiftId);
    await this.assertWorkOrder(workspaceId, dto.workOrderId);
    this.assertClockRange(dto.clockInAt, dto.clockOutAt);

    return this.prisma.attendance.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        clockInAt: dto.clockInAt ? new Date(dto.clockInAt) : undefined,
        clockOutAt: dto.clockOutAt ? new Date(dto.clockOutAt) : undefined,
      },
    });
  }

  async listLeaveRequests(workspaceId: string, query: ListLeaveRequestsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["reason", "reviewNote"]);
    const where = {
      workspaceId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          reviewedBy: { select: { id: true, displayName: true, email: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createLeaveRequest(workspaceId: string, dto: CreateLeaveRequestDto) {
    await this.assertEmployee(workspaceId, dto.employeeId);
    this.assertDateRange(dto.startDate, dto.endDate);

    return this.prisma.leaveRequest.create({
      data: {
        ...dto,
        workspaceId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async updateLeaveRequest(workspaceId: string, id: string, dto: UpdateLeaveRequestDto) {
    await this.assertEmployee(workspaceId, dto.employeeId);
    this.assertDateRange(dto.startDate, dto.endDate);

    return this.prisma.leaveRequest.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  reviewLeaveRequest(
    workspaceId: string,
    id: string,
    user: AuthenticatedUser,
    status: LeaveStatus,
    dto: ReviewLeaveRequestDto,
  ) {
    return this.prisma.leaveRequest.update({
      where: { id, workspaceId },
      data: {
        status,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote,
      },
    });
  }

  private shiftInclude() {
    return {
      facility: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      workOrder: { select: { id: true, workOrderNumber: true, title: true } },
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, status: true } } },
      },
    };
  }

  private async assertFacility(workspaceId: string, facilityId?: string) {
    if (!facilityId) return;
    await this.prisma.facility.findFirstOrThrow({ where: { id: facilityId, workspaceId } });
  }

  private async assertDepartment(workspaceId: string, departmentId?: string) {
    if (!departmentId) return;
    await this.prisma.department.findFirstOrThrow({ where: { id: departmentId, workspaceId } });
  }

  private async assertEmployee(workspaceId: string, employeeId?: string) {
    if (!employeeId) return;
    await this.prisma.employee.findFirstOrThrow({
      where: { id: employeeId, workspaceId, status: { not: "TERMINATED" } },
    });
  }

  private async assertShift(workspaceId: string, shiftId?: string) {
    if (!shiftId) return;
    await this.prisma.shift.findFirstOrThrow({ where: { id: shiftId, workspaceId } });
  }

  private async assertWorkOrder(workspaceId: string, workOrderId?: string) {
    if (!workOrderId) return;
    await this.prisma.workOrder.findFirstOrThrow({ where: { id: workOrderId, workspaceId } });
  }

  private async assertShiftAvailability(
    workspaceId: string,
    employeeId: string,
    shift: { id: string; startAt: Date; endAt: Date },
  ) {
    const conflict = await this.prisma.shiftAssignment.findFirst({
      where: {
        workspaceId,
        employeeId,
        shiftId: { not: shift.id },
        status: { not: ShiftStatus.CANCELLED },
        shift: {
          startAt: { lt: shift.endAt },
          endAt: { gt: shift.startAt },
        },
      },
    });

    if (conflict) {
      throw new BadRequestException("Employee already has an overlapping shift assignment");
    }
  }

  private assertDateRange(start?: string, end?: string) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException("End date cannot be earlier than start date");
    }
  }

  private assertClockRange(clockInAt?: string, clockOutAt?: string) {
    if (clockInAt && clockOutAt && new Date(clockOutAt) < new Date(clockInAt)) {
      throw new BadRequestException("clockOutAt cannot be earlier than clockInAt");
    }
  }
}
