import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { LeaveStatus } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import {
  ListAttendanceQueryDto,
  ListLeaveRequestsQueryDto,
  ListShiftsQueryDto,
} from "./dto/scheduling-query.dto";
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
import { SchedulingService } from "./scheduling.service";

@ApiTags("scheduling")
@ApiBearerAuth()
@RequirePermissions("workforce.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get("shifts")
  listShifts(@Req() request: WorkspaceRequest, @Query() query: ListShiftsQueryDto) {
    return this.schedulingService.listShifts(request.workspaceId, query);
  }

  @Post("shifts")
  createShift(@Req() request: WorkspaceRequest, @Body() dto: CreateShiftDto) {
    return this.schedulingService.createShift(request.workspaceId, dto);
  }

  @Get("shifts/:id")
  getShift(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.schedulingService.getShift(request.workspaceId, id);
  }

  @Patch("shifts/:id")
  updateShift(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateShiftDto) {
    return this.schedulingService.updateShift(request.workspaceId, id, dto);
  }

  @Patch("shifts/:id/status")
  updateShiftStatus(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateShiftStatusDto,
  ) {
    return this.schedulingService.updateShiftStatus(request.workspaceId, id, dto);
  }

  @Post("shifts/:id/assignments")
  addShiftAssignment(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateShiftAssignmentDto,
  ) {
    return this.schedulingService.addShiftAssignment(request.workspaceId, id, dto);
  }

  @Get("attendance")
  listAttendance(@Req() request: WorkspaceRequest, @Query() query: ListAttendanceQueryDto) {
    return this.schedulingService.listAttendance(request.workspaceId, query);
  }

  @Post("attendance")
  createAttendance(@Req() request: WorkspaceRequest, @Body() dto: CreateAttendanceDto) {
    return this.schedulingService.createAttendance(request.workspaceId, dto);
  }

  @Patch("attendance/:id")
  updateAttendance(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateAttendanceDto) {
    return this.schedulingService.updateAttendance(request.workspaceId, id, dto);
  }

  @Get("leave-requests")
  listLeaveRequests(@Req() request: WorkspaceRequest, @Query() query: ListLeaveRequestsQueryDto) {
    return this.schedulingService.listLeaveRequests(request.workspaceId, query);
  }

  @Post("leave-requests")
  createLeaveRequest(@Req() request: WorkspaceRequest, @Body() dto: CreateLeaveRequestDto) {
    return this.schedulingService.createLeaveRequest(request.workspaceId, dto);
  }

  @Patch("leave-requests/:id")
  updateLeaveRequest(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateLeaveRequestDto,
  ) {
    return this.schedulingService.updateLeaveRequest(request.workspaceId, id, dto);
  }

  @Patch("leave-requests/:id/approve")
  approveLeaveRequest(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.schedulingService.reviewLeaveRequest(
      request.workspaceId,
      id,
      user,
      LeaveStatus.APPROVED,
      dto,
    );
  }

  @Patch("leave-requests/:id/reject")
  rejectLeaveRequest(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.schedulingService.reviewLeaveRequest(
      request.workspaceId,
      id,
      user,
      LeaveStatus.REJECTED,
      dto,
    );
  }
}
