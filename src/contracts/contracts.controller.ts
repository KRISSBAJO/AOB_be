import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ContractsService } from "./contracts.service";
import { ListContractsQueryDto } from "./dto/contracts-query.dto";
import {
  AddContractFacilityDto,
  CreateContractDto,
  CreateContractScheduleDto,
  CreateContractServiceDto,
  UpdateContractDto,
  UpdateContractScheduleDto,
  UpdateContractServiceDto,
  UpdateContractStatusDto,
} from "./dto/contracts.dto";

@ApiTags("contracts")
@ApiBearerAuth()
@RequirePermissions("contracts.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  list(@Req() request: WorkspaceRequest, @Query() query: ListContractsQueryDto) {
    return this.contractsService.list(request.workspaceId, query);
  }

  @Post()
  create(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.create(request.workspaceId, user, dto);
  }

  @Get(":id")
  get(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.contractsService.get(request.workspaceId, id);
  }

  @Patch(":id")
  update(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(request.workspaceId, id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateContractStatusDto,
  ) {
    return this.contractsService.updateStatus(request.workspaceId, id, dto);
  }

  @Delete(":id")
  terminate(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.contractsService.terminate(request.workspaceId, id);
  }

  @Post(":id/facilities")
  addFacility(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: AddContractFacilityDto,
  ) {
    return this.contractsService.addFacility(request.workspaceId, id, dto);
  }

  @Delete(":id/facilities/:facilityId")
  removeFacility(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Param("facilityId") facilityId: string,
  ) {
    return this.contractsService.removeFacility(request.workspaceId, id, facilityId);
  }

  @Get(":id/services")
  listServices(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.contractsService.listServices(request.workspaceId, id);
  }

  @Post(":id/services")
  createService(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateContractServiceDto,
  ) {
    return this.contractsService.createService(request.workspaceId, id, dto);
  }

  @Patch("/services/:serviceId")
  updateService(
    @Req() request: WorkspaceRequest,
    @Param("serviceId") serviceId: string,
    @Body() dto: UpdateContractServiceDto,
  ) {
    return this.contractsService.updateContractService(request.workspaceId, serviceId, dto);
  }

  @Delete("/services/:serviceId")
  deactivateService(@Req() request: WorkspaceRequest, @Param("serviceId") serviceId: string) {
    return this.contractsService.deactivateContractService(request.workspaceId, serviceId);
  }

  @Get(":id/schedules")
  listSchedules(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.contractsService.listSchedules(request.workspaceId, id);
  }

  @Post(":id/schedules")
  createSchedule(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateContractScheduleDto,
  ) {
    return this.contractsService.createSchedule(request.workspaceId, id, dto);
  }

  @Patch("/schedules/:scheduleId")
  updateSchedule(
    @Req() request: WorkspaceRequest,
    @Param("scheduleId") scheduleId: string,
    @Body() dto: UpdateContractScheduleDto,
  ) {
    return this.contractsService.updateSchedule(request.workspaceId, scheduleId, dto);
  }

  @Delete("/schedules/:scheduleId")
  deactivateSchedule(@Req() request: WorkspaceRequest, @Param("scheduleId") scheduleId: string) {
    return this.contractsService.deactivateSchedule(request.workspaceId, scheduleId);
  }
}
