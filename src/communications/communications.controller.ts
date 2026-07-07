import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import {
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  ListNotificationsQueryDto,
} from "./dto/communications-query.dto";
import {
  CreateConversationDto,
  CreateConversationMessageDto,
  CreateConversationParticipantDto,
  CreateMessageAttachmentDto,
  CreateNotificationDto,
  UpdateConversationDto,
} from "./dto/communications.dto";
import { CommunicationsService } from "./communications.service";

@ApiTags("communications")
@ApiBearerAuth()
@RequirePermissions("operations.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get("conversations")
  listConversations(@Req() request: WorkspaceRequest, @Query() query: ListConversationsQueryDto) {
    return this.communicationsService.listConversations(request.workspaceId, query);
  }

  @Post("conversations")
  createConversation(@Req() request: WorkspaceRequest, @Body() dto: CreateConversationDto) {
    return this.communicationsService.createConversation(request.workspaceId, dto);
  }

  @Get("conversations/:id")
  getConversation(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.communicationsService.getConversation(request.workspaceId, id);
  }

  @Patch("conversations/:id")
  updateConversation(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateConversationDto) {
    return this.communicationsService.updateConversation(request.workspaceId, id, dto);
  }

  @Post("conversations/:id/participants")
  addParticipant(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateConversationParticipantDto,
  ) {
    return this.communicationsService.addParticipant(request.workspaceId, id, dto);
  }

  @Get("conversations/:id/messages")
  listMessages(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.communicationsService.listMessages(request.workspaceId, id, query);
  }

  @Post("conversations/:id/messages")
  addMessage(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateConversationMessageDto,
  ) {
    return this.communicationsService.addMessage(request.workspaceId, id, user, dto);
  }

  @Post("messages/:id/attachments")
  addMessageAttachment(
    @Req() request: WorkspaceRequest,
    @Param("id") id: string,
    @Body() dto: CreateMessageAttachmentDto,
  ) {
    return this.communicationsService.addMessageAttachment(request.workspaceId, id, dto);
  }

  @Delete("messages/:id")
  deleteMessage(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.communicationsService.deleteMessage(request.workspaceId, id);
  }

  @Get("notifications")
  listNotifications(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.communicationsService.listNotifications(request.workspaceId, user, query);
  }

  @Post("notifications")
  createNotification(@Req() request: WorkspaceRequest, @Body() dto: CreateNotificationDto) {
    return this.communicationsService.createNotification(request.workspaceId, dto);
  }

  @Patch("notifications/read-all")
  readAllNotifications(@Req() request: WorkspaceRequest, @CurrentUser() user: AuthenticatedUser) {
    return this.communicationsService.readAllNotifications(request.workspaceId, user);
  }

  @Patch("notifications/:id/read")
  readNotification(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.communicationsService.readNotification(request.workspaceId, id);
  }

  @Get("notifications/delivery-config")
  getDeliveryConfig() {
    return this.communicationsService.getDeliveryConfig();
  }
}
