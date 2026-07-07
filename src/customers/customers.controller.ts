import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { InviteUserDto } from "../auth/dto/invite-user.dto";
import { CreateCustomerDto, CreateCustomerContactDto, UpdateCustomerContactDto, UpdateCustomerDto } from "./dto/customer.dto";
import { ListCustomersQueryDto, ListFacilitiesQueryDto } from "./dto/customer-query.dto";
import { CreateFacilityContactDto, CreateFacilityDto, UpdateFacilityContactDto, UpdateFacilityDto } from "./dto/facility.dto";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@ApiBearerAuth()
@RequirePermissions("customers.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @RequirePermissions("operations.manage")
  @Get("customers")
  listCustomers(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customersService.listCustomers(request.workspaceId, user, query);
  }

  @Post("customers")
  createCustomer(@Req() request: WorkspaceRequest, @Body() dto: CreateCustomerDto) {
    return this.customersService.createCustomer(request.workspaceId, dto);
  }

  @RequirePermissions("operations.manage")
  @Get("customers/:id")
  getCustomer(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.customersService.getCustomer(request.workspaceId, user, id);
  }

  @Patch("customers/:id")
  updateCustomer(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(request.workspaceId, id, dto);
  }

  @Delete("customers/:id")
  archiveCustomer(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.customersService.archiveCustomer(request.workspaceId, id);
  }

  @RequirePermissions("operations.manage")
  @Get("customers/:customerId/contacts")
  listCustomerContacts(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("customerId") customerId: string,
  ) {
    return this.customersService.listCustomerContacts(
      request.workspaceId,
      user,
      customerId,
    );
  }

  @Post("customers/:customerId/contacts")
  createCustomerContact(
    @Req() request: WorkspaceRequest,
    @Param("customerId") customerId: string,
    @Body() dto: CreateCustomerContactDto,
  ) {
    return this.customersService.createCustomerContact(request.workspaceId, customerId, dto);
  }

  @Patch("customer-contacts/:id")
  updateCustomerContact(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerContactDto,
  ) {
    return this.customersService.updateCustomerContact(request.workspaceId, id, dto);
  }

  @Delete("customer-contacts/:id")
  deleteCustomerContact(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.customersService.deleteCustomerContact(request.workspaceId, id);
  }

  @Post("customer-contacts/:id/invite")
  inviteCustomerContact(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.customersService.inviteCustomerContact(request.workspaceId, id, dto);
  }

  @RequirePermissions("operations.manage")
  @Get("facilities")
  listFacilities(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFacilitiesQueryDto,
  ) {
    return this.customersService.listFacilities(request.workspaceId, user, query);
  }

  @Post("facilities")
  createFacility(@Req() request: WorkspaceRequest, @Body() dto: CreateFacilityDto) {
    return this.customersService.createFacility(request.workspaceId, dto);
  }

  @RequirePermissions("operations.manage")
  @Get("facilities/:id")
  getFacility(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.customersService.getFacility(request.workspaceId, user, id);
  }

  @Patch("facilities/:id")
  updateFacility(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.customersService.updateFacility(request.workspaceId, id, dto);
  }

  @Delete("facilities/:id")
  archiveFacility(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.customersService.archiveFacility(request.workspaceId, id);
  }

  @RequirePermissions("operations.manage")
  @Get("facilities/:facilityId/contacts")
  listFacilityContacts(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("facilityId") facilityId: string,
  ) {
    return this.customersService.listFacilityContacts(
      request.workspaceId,
      user,
      facilityId,
    );
  }

  @Post("facilities/:facilityId/contacts")
  createFacilityContact(
    @Req() request: WorkspaceRequest,
    @Param("facilityId") facilityId: string,
    @Body() dto: CreateFacilityContactDto,
  ) {
    return this.customersService.createFacilityContact(request.workspaceId, facilityId, dto);
  }

  @Patch("facility-contacts/:id")
  updateFacilityContact(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateFacilityContactDto,
  ) {
    return this.customersService.updateFacilityContact(request.workspaceId, id, dto);
  }

  @Delete("facility-contacts/:id")
  deleteFacilityContact(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.customersService.deleteFacilityContact(request.workspaceId, id);
  }

  @Post("facility-contacts/:id/invite")
  inviteFacilityContact(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.customersService.inviteFacilityContact(request.workspaceId, id, dto);
  }
}
