import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { AdminService } from "./admin.service";
import {
  ListAuditLogsQueryDto,
  ListBackgroundJobsQueryDto,
  ListSystemSettingsQueryDto,
} from "./dto/admin-query.dto";
import { CreateBackgroundJobDto, UpsertSystemSettingDto } from "./dto/admin.dto";

@ApiTags("admin")
@ApiBearerAuth()
@RequirePermissions("settings.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("audit-logs")
  auditLogs(@Req() request: WorkspaceRequest, @Query() query: ListAuditLogsQueryDto) {
    return this.adminService.auditLogs(request.workspaceId, query);
  }

  @Get("system-settings")
  systemSettings(@Req() request: WorkspaceRequest, @Query() query: ListSystemSettingsQueryDto) {
    return this.adminService.systemSettings(request.workspaceId, query);
  }

  @Patch("system-settings/:key")
  upsertSystemSetting(
    @Req() request: WorkspaceRequest,
    @Param("key") key: string,
    @Body() dto: UpsertSystemSettingDto,
  ) {
    return this.adminService.upsertSystemSetting(request.workspaceId, key, dto);
  }

  @Get("background-jobs")
  backgroundJobs(@Req() request: WorkspaceRequest, @Query() query: ListBackgroundJobsQueryDto) {
    return this.adminService.backgroundJobs(request.workspaceId, query);
  }

  @Post("background-jobs")
  createBackgroundJob(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBackgroundJobDto,
  ) {
    return this.adminService.createBackgroundJob(request.workspaceId, user, dto);
  }

  @Post("background-jobs/:id/retry")
  retryBackgroundJob(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.adminService.retryBackgroundJob(request.workspaceId, id);
  }
}
