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
import { ListDepartmentsQueryDto, ListEmployeesQueryDto } from "./dto/workforce-query.dto";
import {
  AssignEmployeeCertificationDto,
  AssignEmployeeSkillDto,
  CreateCertificationDto,
  CreateDepartmentDto,
  CreateEmployeeDto,
  CreatePositionDto,
  CreateSkillDto,
  UpdateCertificationDto,
  UpdateDepartmentDto,
  UpdateEmployeeDto,
  UpdatePositionDto,
  UpdateSkillDto,
} from "./dto/workforce.dto";
import { WorkforceService } from "./workforce.service";

@ApiTags("workforce")
@ApiBearerAuth()
@RequirePermissions("workforce.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get("departments")
  listDepartments(@Req() request: WorkspaceRequest, @Query() query: ListDepartmentsQueryDto) {
    return this.workforceService.listDepartments(request.workspaceId, query);
  }

  @Post("departments")
  createDepartment(@Req() request: WorkspaceRequest, @Body() dto: CreateDepartmentDto) {
    return this.workforceService.createDepartment(request.workspaceId, dto);
  }

  @Patch("departments/:id")
  updateDepartment(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.workforceService.updateDepartment(request.workspaceId, id, dto);
  }

  @Delete("departments/:id")
  deactivateDepartment(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.workforceService.deactivateDepartment(request.workspaceId, id);
  }

  @Get("positions")
  listPositions(@Req() request: WorkspaceRequest) {
    return this.workforceService.listPositions(request.workspaceId);
  }

  @Post("positions")
  createPosition(@Req() request: WorkspaceRequest, @Body() dto: CreatePositionDto) {
    return this.workforceService.createPosition(request.workspaceId, dto);
  }

  @Patch("positions/:id")
  updatePosition(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdatePositionDto) {
    return this.workforceService.updatePosition(request.workspaceId, id, dto);
  }

  @Delete("positions/:id")
  deactivatePosition(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.workforceService.deactivatePosition(request.workspaceId, id);
  }

  @Get("skills")
  listSkills(@Req() request: WorkspaceRequest) {
    return this.workforceService.listSkills(request.workspaceId);
  }

  @Post("skills")
  createSkill(@Req() request: WorkspaceRequest, @Body() dto: CreateSkillDto) {
    return this.workforceService.createSkill(request.workspaceId, dto);
  }

  @Patch("skills/:id")
  updateSkill(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateSkillDto) {
    return this.workforceService.updateSkill(request.workspaceId, id, dto);
  }

  @Delete("skills/:id")
  deleteSkill(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.workforceService.deleteSkill(request.workspaceId, id);
  }

  @Get("certifications")
  listCertifications(@Req() request: WorkspaceRequest) {
    return this.workforceService.listCertifications(request.workspaceId);
  }

  @Post("certifications")
  createCertification(@Req() request: WorkspaceRequest, @Body() dto: CreateCertificationDto) {
    return this.workforceService.createCertification(request.workspaceId, dto);
  }

  @Patch("certifications/:id")
  updateCertification(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.workforceService.updateCertification(request.workspaceId, id, dto);
  }

  @Delete("certifications/:id")
  deleteCertification(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.workforceService.deleteCertification(request.workspaceId, id);
  }

  @RequirePermissions("operations.manage")
  @Get("employees")
  listEmployees(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.workforceService.listEmployees(request.workspaceId, user, query);
  }

  @Post("employees")
  createEmployee(@Req() request: WorkspaceRequest, @Body() dto: CreateEmployeeDto) {
    return this.workforceService.createEmployee(request.workspaceId, dto);
  }

  @RequirePermissions("operations.manage")
  @Get("employees/:id")
  getEmployee(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.workforceService.getEmployee(request.workspaceId, user, id);
  }

  @Patch("employees/:id")
  updateEmployee(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.workforceService.updateEmployee(request.workspaceId, id, dto);
  }

  @Delete("employees/:id")
  terminateEmployee(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.workforceService.terminateEmployee(request.workspaceId, id);
  }

  @Post("employees/:id/invite")
  inviteEmployee(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.workforceService.inviteEmployee(request.workspaceId, id, dto);
  }

  @Post("employees/:id/skills")
  assignSkill(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: AssignEmployeeSkillDto) {
    return this.workforceService.assignSkill(request.workspaceId, id, dto);
  }

  @Post("employees/:id/certifications")
  assignCertification(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: AssignEmployeeCertificationDto,
  ) {
    return this.workforceService.assignCertification(request.workspaceId, id, dto);
  }
}
