import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ListInspectionsQueryDto, ListInspectionTemplatesQueryDto } from "./dto/qa-query.dto";
import {
  CompleteInspectionDto,
  CreateInspectionDto,
  CreateInspectionResultDto,
  CreateInspectionTemplateDto,
  CreateInspectionTemplateItemDto,
  UpdateInspectionDto,
  UpdateInspectionTemplateDto,
} from "./dto/qa.dto";
import { QaService } from "./qa.service";

@ApiTags("qa")
@ApiBearerAuth()
@RequirePermissions("qa.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Get("inspection-templates")
  listTemplates(@Req() request: WorkspaceRequest, @Query() query: ListInspectionTemplatesQueryDto) {
    return this.qaService.listTemplates(request.workspaceId, query);
  }

  @Post("inspection-templates")
  createTemplate(@Req() request: WorkspaceRequest, @Body() dto: CreateInspectionTemplateDto) {
    return this.qaService.createTemplate(request.workspaceId, dto);
  }

  @Patch("inspection-templates/:id")
  updateTemplate(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateInspectionTemplateDto) {
    return this.qaService.updateTemplate(request.workspaceId, id, dto);
  }

  @Delete("inspection-templates/:id")
  deactivateTemplate(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.qaService.deactivateTemplate(request.workspaceId, id);
  }

  @Post("inspection-templates/:id/items")
  addTemplateItem(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: CreateInspectionTemplateItemDto) {
    return this.qaService.addTemplateItem(request.workspaceId, id, dto);
  }

  @Get("inspections")
  listInspections(@Req() request: WorkspaceRequest, @Query() query: ListInspectionsQueryDto) {
    return this.qaService.listInspections(request.workspaceId, query);
  }

  @Post("inspections")
  createInspection(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInspectionDto,
  ) {
    return this.qaService.createInspection(request.workspaceId, user, dto);
  }

  @Patch("inspections/:id")
  updateInspection(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateInspectionDto) {
    return this.qaService.updateInspection(request.workspaceId, id, dto);
  }

  @Post("inspections/:id/results")
  addResult(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: CreateInspectionResultDto) {
    return this.qaService.addResult(request.workspaceId, id, dto);
  }

  @Patch("inspections/:id/complete")
  completeInspection(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: CompleteInspectionDto) {
    return this.qaService.completeInspection(request.workspaceId, id, dto);
  }
}
