import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ListWorkOrdersQueryDto } from "./dto/work-orders-query.dto";
import {
  CreateWorkOrderAssignmentDto,
  CreateWorkOrderDto,
  CreateWorkOrderPhotoDto,
  CreateWorkOrderSignoffDto,
  CreateWorkOrderTaskDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  UpdateWorkOrderTaskDto,
} from "./dto/work-orders.dto";
import { WorkOrdersService } from "./work-orders.service";

@ApiTags("work-orders")
@ApiBearerAuth()
@RequirePermissions("operations.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  list(@Req() request: WorkspaceRequest, @Query() query: ListWorkOrdersQueryDto) {
    return this.workOrdersService.list(request.workspaceId, query);
  }

  @Post()
  create(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.workOrdersService.create(request.workspaceId, user, dto);
  }

  @Get(":id")
  get(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.workOrdersService.get(request.workspaceId, id);
  }

  @Patch(":id")
  update(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(request.workspaceId, id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.workOrdersService.updateStatus(request.workspaceId, id, user, dto);
  }

  @Post(":id/tasks")
  addTask(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: CreateWorkOrderTaskDto) {
    return this.workOrdersService.addTask(request.workspaceId, id, dto);
  }

  @Patch("tasks/:taskId")
  updateTask(
    @Req() request: WorkspaceRequest,
    @Param("taskId") taskId: string,
    @Body() dto: UpdateWorkOrderTaskDto,
  ) {
    return this.workOrdersService.updateTask(request.workspaceId, taskId, dto);
  }

  @Post(":id/assignments")
  addAssignment(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateWorkOrderAssignmentDto,
  ) {
    return this.workOrdersService.addAssignment(request.workspaceId, id, dto);
  }

  @Post(":id/photos")
  addPhoto(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateWorkOrderPhotoDto,
  ) {
    return this.workOrdersService.addPhoto(request.workspaceId, id, user, dto);
  }

  @Post(":id/signoff")
  signoff(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: CreateWorkOrderSignoffDto) {
    return this.workOrdersService.signoff(request.workspaceId, id, dto);
  }

  @Delete(":id")
  cancel(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.workOrdersService.cancel(request.workspaceId, id, user);
  }
}
