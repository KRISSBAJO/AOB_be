import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { DashboardService } from "./dashboard.service";
import { DashboardRangeQueryDto, DashboardWorkOrdersQueryDto } from "./dto/dashboard-query.dto";

@ApiTags("dashboard")
@ApiBearerAuth()
@RequirePermissions("reports.read")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermissions("operations.manage")
  @Get("overview")
  overview(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardRangeQueryDto,
  ) {
    return this.dashboardService.overview(request.workspaceId, user, query);
  }

  @RequirePermissions("operations.manage")
  @Get("work-orders")
  workOrders(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardWorkOrdersQueryDto,
  ) {
    return this.dashboardService.workOrders(request.workspaceId, user, query);
  }

  @Get("revenue")
  revenue(@Req() request: WorkspaceRequest, @Query() query: DashboardRangeQueryDto) {
    return this.dashboardService.revenue(request.workspaceId, query);
  }
}
