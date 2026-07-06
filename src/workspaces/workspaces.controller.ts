import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateMembershipDto, UpdateMembershipDto } from "./dto/membership.dto";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@ApiTags("workspaces")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.workspacesService.findOne(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspacesService.update(user, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.workspacesService.remove(user, id);
  }

  @Post(":id/members")
  addMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateMembershipDto) {
    return this.workspacesService.addMember(user, id, dto);
  }

  @Patch(":id/members/:memberId")
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.workspacesService.updateMember(user, id, memberId, dto);
  }

  @Delete(":id/members/:memberId")
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("memberId") memberId: string,
  ) {
    return this.workspacesService.removeMember(user, id, memberId);
  }
}

