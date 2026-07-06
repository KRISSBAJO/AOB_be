import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ListServiceAreasQueryDto, ListServiceCategoriesQueryDto, ListServicesQueryDto } from "./dto/services-query.dto";
import {
  CreateServiceAreaDto,
  CreateServiceCategoryDto,
  CreateServiceDto,
  CreateServicePriceDto,
  CreateServiceRequirementDto,
  UpdateServiceAreaDto,
  UpdateServiceCategoryDto,
  UpdateServiceDto,
  UpdateServicePriceDto,
  UpdateServiceRequirementDto,
} from "./dto/services.dto";
import { ServicesService } from "./services.service";

@ApiTags("services")
@ApiBearerAuth()
@RequirePermissions("services.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get("service-categories")
  listCategories(@Req() request: WorkspaceRequest, @Query() query: ListServiceCategoriesQueryDto) {
    return this.servicesService.listCategories(request.workspaceId, query);
  }

  @Post("service-categories")
  createCategory(@Req() request: WorkspaceRequest, @Body() dto: CreateServiceCategoryDto) {
    return this.servicesService.createCategory(request.workspaceId, dto);
  }

  @Get("service-categories/:id")
  getCategory(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.getCategory(request.workspaceId, id);
  }

  @Patch("service-categories/:id")
  updateCategory(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ) {
    return this.servicesService.updateCategory(request.workspaceId, id, dto);
  }

  @Delete("service-categories/:id")
  deactivateCategory(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.deactivateCategory(request.workspaceId, id);
  }

  @Get("services")
  listServices(@Req() request: WorkspaceRequest, @Query() query: ListServicesQueryDto) {
    return this.servicesService.listServices(request.workspaceId, query);
  }

  @Post("services")
  createService(@Req() request: WorkspaceRequest, @Body() dto: CreateServiceDto) {
    return this.servicesService.createService(request.workspaceId, dto);
  }

  @Get("services/:id")
  getService(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.getService(request.workspaceId, id);
  }

  @Patch("services/:id")
  updateService(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(request.workspaceId, id, dto);
  }

  @Delete("services/:id")
  deactivateService(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.deactivateService(request.workspaceId, id);
  }

  @Get("services/:serviceId/prices")
  listPrices(@Req() request: WorkspaceRequest, @Param("serviceId") serviceId: string) {
    return this.servicesService.listPrices(request.workspaceId, serviceId);
  }

  @Post("services/:serviceId/prices")
  createPrice(
    @Req() request: WorkspaceRequest,
    @Param("serviceId") serviceId: string,
    @Body() dto: CreateServicePriceDto,
  ) {
    return this.servicesService.createPrice(request.workspaceId, serviceId, dto);
  }

  @Patch("service-prices/:id")
  updatePrice(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateServicePriceDto,
  ) {
    return this.servicesService.updatePrice(request.workspaceId, id, dto);
  }

  @Delete("service-prices/:id")
  deactivatePrice(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.deactivatePrice(request.workspaceId, id);
  }

  @Get("services/:serviceId/requirements")
  listRequirements(@Req() request: WorkspaceRequest, @Param("serviceId") serviceId: string) {
    return this.servicesService.listRequirements(request.workspaceId, serviceId);
  }

  @Post("services/:serviceId/requirements")
  createRequirement(
    @Req() request: WorkspaceRequest,
    @Param("serviceId") serviceId: string,
    @Body() dto: CreateServiceRequirementDto,
  ) {
    return this.servicesService.createRequirement(request.workspaceId, serviceId, dto);
  }

  @Patch("service-requirements/:id")
  updateRequirement(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateServiceRequirementDto,
  ) {
    return this.servicesService.updateRequirement(request.workspaceId, id, dto);
  }

  @Delete("service-requirements/:id")
  deleteRequirement(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.deleteRequirement(request.workspaceId, id);
  }

  @Get("service-areas")
  listAreas(@Req() request: WorkspaceRequest, @Query() query: ListServiceAreasQueryDto) {
    return this.servicesService.listAreas(request.workspaceId, query);
  }

  @Post("service-areas")
  createArea(@Req() request: WorkspaceRequest, @Body() dto: CreateServiceAreaDto) {
    return this.servicesService.createArea(request.workspaceId, dto);
  }

  @Patch("service-areas/:id")
  updateArea(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateServiceAreaDto,
  ) {
    return this.servicesService.updateArea(request.workspaceId, id, dto);
  }

  @Delete("service-areas/:id")
  deactivateArea(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.servicesService.deactivateArea(request.workspaceId, id);
  }
}
