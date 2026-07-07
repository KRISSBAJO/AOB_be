import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { PayrollSummaryQueryDto } from "./dto/staff-portal.dto";
import { StaffPortalService } from "./staff-portal.service";

@ApiTags("payroll")
@ApiBearerAuth()
@RequirePermissions("workforce.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly staffPortalService: StaffPortalService) {}

  @Get("summary")
  summary(
    @Req() request: WorkspaceRequest,
    @Query() query: PayrollSummaryQueryDto,
  ) {
    return this.staffPortalService.payrollSummary(request.workspaceId, query);
  }
}
