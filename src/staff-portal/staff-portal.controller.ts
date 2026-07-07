import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ClockInDto, ClockOutDto } from "./dto/staff-portal.dto";
import { StaffPortalService } from "./staff-portal.service";

@ApiTags("staff")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("staff")
export class StaffPortalController {
  constructor(private readonly staffPortalService: StaffPortalService) {}

  @Get("me")
  me(@Req() request: WorkspaceRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.staffPortalService.getMe(request.workspaceId, user);
  }

  @Post("clock-in")
  clockIn(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClockInDto,
  ) {
    return this.staffPortalService.clockIn(request.workspaceId, user, dto);
  }

  @Post("clock-out")
  clockOut(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClockOutDto,
  ) {
    return this.staffPortalService.clockOut(request.workspaceId, user, dto);
  }
}
