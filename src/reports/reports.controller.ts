import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import {
  InvoicesReportQueryDto,
  ServiceRequestsReportQueryDto,
  WorkOrdersReportQueryDto,
} from "./dto/reports-query.dto";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@RequirePermissions("reports.read")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("service-requests")
  serviceRequests(@Req() request: WorkspaceRequest, @Query() query: ServiceRequestsReportQueryDto) {
    return this.reportsService.serviceRequests(request.workspaceId, query);
  }

  @Get("work-orders")
  workOrders(@Req() request: WorkspaceRequest, @Query() query: WorkOrdersReportQueryDto) {
    return this.reportsService.workOrders(request.workspaceId, query);
  }

  @Get("invoices")
  invoices(@Req() request: WorkspaceRequest, @Query() query: InvoicesReportQueryDto) {
    return this.reportsService.invoices(request.workspaceId, query);
  }
}
