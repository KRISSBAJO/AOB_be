import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CreateRoleDto } from "./dto/create-role.dto";
import { RolePermissionDto } from "./dto/role-permission.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

@ApiTags("roles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  list(@Query("workspaceId") workspaceId: string) {
    return this.rolesService.list(workspaceId);
  }

  @Post()
  create(@Query("workspaceId") workspaceId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(workspaceId, dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.rolesService.remove(id);
  }

  @Post(":id/permissions")
  addPermission(@Param("id") id: string, @Body() dto: RolePermissionDto) {
    return this.rolesService.addPermission(id, dto.permissionCode);
  }

  @Delete(":id/permissions/:permissionCode")
  removePermission(@Param("id") id: string, @Param("permissionCode") permissionCode: string) {
    return this.rolesService.removePermission(id, permissionCode);
  }
}

