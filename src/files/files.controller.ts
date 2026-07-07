import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { ListAttachmentsQueryDto, ListCommentsQueryDto } from "./dto/files-query.dto";
import { CreateAttachmentDto, CreateCommentDto, UpdateCommentDto } from "./dto/files.dto";
import { FilesService } from "./files.service";

@ApiTags("files")
@ApiBearerAuth()
@RequirePermissions("operations.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get("attachments/storage-targets")
  getStorageTargets() {
    return this.filesService.getStorageTargets();
  }

  @Get("attachments")
  listAttachments(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAttachmentsQueryDto,
  ) {
    return this.filesService.listAttachments(request.workspaceId, user, query);
  }

  @Post("attachments")
  createAttachment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.filesService.createAttachment(request.workspaceId, user, dto);
  }

  @Get("attachments/:id")
  getAttachment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.filesService.getAttachment(request.workspaceId, user, id);
  }

  @Delete("attachments/:id")
  deleteAttachment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.filesService.deleteAttachment(request.workspaceId, user, id);
  }

  @Get("comments")
  listComments(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCommentsQueryDto,
  ) {
    return this.filesService.listComments(request.workspaceId, user, query);
  }

  @Post("comments")
  createComment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.filesService.createComment(request.workspaceId, user, dto);
  }

  @Patch("comments/:id")
  updateComment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.filesService.updateComment(request.workspaceId, user, id, dto);
  }

  @Delete("comments/:id")
  deleteComment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.filesService.deleteComment(request.workspaceId, user, id);
  }
}
