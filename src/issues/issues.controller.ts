import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ListComplaintsQueryDto, ListCorrectiveActionsQueryDto, ListIncidentsQueryDto } from "./dto/issues-query.dto";
import {
  CreateComplaintDto,
  CreateCorrectiveActionDto,
  CreateIncidentDto,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
  UpdateCorrectiveActionDto,
  UpdateIncidentDto,
} from "./dto/issues.dto";
import { IssuesService } from "./issues.service";

@ApiTags("issues")
@ApiBearerAuth()
@RequirePermissions("operations.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get("complaints")
  listComplaints(@Req() request: WorkspaceRequest, @Query() query: ListComplaintsQueryDto) {
    return this.issuesService.listComplaints(request.workspaceId, query);
  }

  @Post("complaints")
  createComplaint(@Req() request: WorkspaceRequest, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateComplaintDto) {
    return this.issuesService.createComplaint(request.workspaceId, user, dto);
  }

  @Patch("complaints/:id")
  updateComplaint(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateComplaintDto) {
    return this.issuesService.updateComplaint(request.workspaceId, id, dto);
  }

  @Patch("complaints/:id/status")
  updateComplaintStatus(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateComplaintStatusDto) {
    return this.issuesService.updateComplaintStatus(request.workspaceId, id, dto);
  }

  @Get("corrective-actions")
  listCorrectiveActions(@Req() request: WorkspaceRequest, @Query() query: ListCorrectiveActionsQueryDto) {
    return this.issuesService.listCorrectiveActions(request.workspaceId, query);
  }

  @Post("corrective-actions")
  createCorrectiveAction(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCorrectiveActionDto,
  ) {
    return this.issuesService.createCorrectiveAction(request.workspaceId, user, dto);
  }

  @Patch("corrective-actions/:id")
  updateCorrectiveAction(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateCorrectiveActionDto) {
    return this.issuesService.updateCorrectiveAction(request.workspaceId, id, dto);
  }

  @Get("incidents")
  listIncidents(@Req() request: WorkspaceRequest, @Query() query: ListIncidentsQueryDto) {
    return this.issuesService.listIncidents(request.workspaceId, query);
  }

  @Post("incidents")
  createIncident(@Req() request: WorkspaceRequest, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateIncidentDto) {
    return this.issuesService.createIncident(request.workspaceId, user, dto);
  }

  @Patch("incidents/:id")
  updateIncident(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateIncidentDto) {
    return this.issuesService.updateIncident(request.workspaceId, id, dto);
  }
}
