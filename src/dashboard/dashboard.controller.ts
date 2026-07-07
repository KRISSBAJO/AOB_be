import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

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

  @Get("overview")
  overview(@Req() request: WorkspaceRequest, @Query() query: DashboardRangeQueryDto) {
    return this.dashboardService.overview(request.workspaceId, query);
  }

  @Get("work-orders")
  workOrders(@Req() request: WorkspaceRequest, @Query() query: DashboardWorkOrdersQueryDto) {
    return this.dashboardService.workOrders(request.workspaceId, query);
  }

  @Get("revenue")
  revenue(@Req() request: WorkspaceRequest, @Query() query: DashboardRangeQueryDto) {
    return this.dashboardService.revenue(request.workspaceId, query);
  }
}
