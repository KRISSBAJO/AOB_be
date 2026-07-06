import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ListServiceRequestsQueryDto } from "./dto/service-requests-query.dto";
import {
  ConvertServiceRequestDto,
  CreateServiceRequestDto,
  CreateServiceRequestItemDto,
  UpdateServiceRequestDto,
  UpdateServiceRequestStatusDto,
} from "./dto/service-requests.dto";
import { ServiceRequestsService } from "./service-requests.service";

@ApiTags("service-requests")
@ApiBearerAuth()
@RequirePermissions("operations.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller("service-requests")
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

  @Get()
  list(@Req() request: WorkspaceRequest, @Query() query: ListServiceRequestsQueryDto) {
    return this.serviceRequestsService.list(request.workspaceId, query);
  }

  @Post()
  create(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.serviceRequestsService.create(request.workspaceId, user, dto);
  }

  @Get(":id")
  get(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.serviceRequestsService.get(request.workspaceId, id);
  }

  @Patch(":id")
  update(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    return this.serviceRequestsService.update(request.workspaceId, id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateServiceRequestStatusDto,
  ) {
    return this.serviceRequestsService.updateStatus(request.workspaceId, id, user, dto);
  }

  @Post(":id/items")
  addItem(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateServiceRequestItemDto,
  ) {
    return this.serviceRequestsService.addItem(request.workspaceId, id, dto);
  }

  @Post(":id/approve")
  approve(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.serviceRequestsService.approve(request.workspaceId, id, user);
  }

  @Post(":id/reject")
  reject(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.serviceRequestsService.reject(request.workspaceId, id, user);
  }

  @Post(":id/convert-to-work-order")
  convertToWorkOrder(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ConvertServiceRequestDto,
  ) {
    return this.serviceRequestsService.convertToWorkOrder(request.workspaceId, id, user, dto);
  }

  @Delete(":id")
  cancel(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.serviceRequestsService.cancel(request.workspaceId, id, user);
  }
}
