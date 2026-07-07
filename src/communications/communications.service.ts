import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AttachmentEntityType,
  MessageVisibility,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { WorkspaceAccessService } from "../common/access/workspace-access.service";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
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

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async listConversations(
    workspaceId: string,
    user: AuthenticatedUser,
    query: ListConversationsQueryDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["title"]);
    const where: Prisma.ConversationWhereInput = {
      workspaceId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
      ...(query.serviceRequestId ? { serviceRequestId: query.serviceRequestId } : {}),
      ...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
      ...(search ? { OR: search } : {}),
      AND: [this.access.conversationWhere(scope)],
    };

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: this.conversationInclude(false),
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createConversation(
    workspaceId: string,
    user: AuthenticatedUser,
    dto: CreateConversationDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    this.access.assertUnrestricted(scope);
    await this.assertConversationRelations(workspaceId, dto);

    return this.prisma.conversation.create({
      data: {
        workspaceId,
        type: dto.type,
        customerId: dto.customerId,
        facilityId: dto.facilityId,
        serviceRequestId: dto.serviceRequestId,
        workOrderId: dto.workOrderId,
        title: dto.title?.trim(),
        isClosed: dto.isClosed,
      },
      include: this.conversationInclude(true),
    });
  }

  async getConversation(workspaceId: string, user: AuthenticatedUser, id: string) {
    const scope = await this.access.getScope(workspaceId, user);
    return this.prisma.conversation.findFirstOrThrow({
      where: { id, workspaceId, AND: [this.access.conversationWhere(scope)] },
      include: this.conversationInclude(true),
    });
  }

  async updateConversation(
    workspaceId: string,
    user: AuthenticatedUser,
    id: string,
    dto: UpdateConversationDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    this.access.assertUnrestricted(scope);
    await this.assertConversationRelations(workspaceId, dto);

    return this.prisma.conversation.update({
      where: { id, workspaceId },
      data: {
        type: dto.type,
        customerId: dto.customerId,
        facilityId: dto.facilityId,
        serviceRequestId: dto.serviceRequestId,
        workOrderId: dto.workOrderId,
        title: dto.title?.trim(),
        isClosed: dto.isClosed,
      },
      include: this.conversationInclude(true),
    });
  }

  async addParticipant(
    workspaceId: string,
    user: AuthenticatedUser,
    conversationId: string,
    dto: CreateConversationParticipantDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    this.access.assertUnrestricted(scope);
    await this.prisma.conversation.findFirstOrThrow({ where: { id: conversationId, workspaceId } });
    await this.assertParticipantRelations(workspaceId, dto);

    return this.prisma.conversationParticipant.create({
      data: {
        workspaceId,
        conversationId,
        type: dto.type,
        userId: dto.userId,
        employeeId: dto.employeeId,
        customerContactId: dto.customerContactId,
        displayName: dto.displayName.trim(),
      },
    });
  }

  async listMessages(
    workspaceId: string,
    user: AuthenticatedUser,
    conversationId: string,
    query: ListMessagesQueryDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    await this.prisma.conversation.findFirstOrThrow({
      where: {
        id: conversationId,
        workspaceId,
        AND: [this.access.conversationWhere(scope)],
      },
    });
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["body", "senderName"]);
    const where = {
      workspaceId,
      conversationId,
      deletedAt: null,
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { attachments: true },
      }),
      this.prisma.message.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async addMessage(
    workspaceId: string,
    conversationId: string,
    user: AuthenticatedUser,
    dto: CreateConversationMessageDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: {
        id: conversationId,
        workspaceId,
        AND: [this.access.conversationWhere(scope)],
      },
    });
    if (conversation.isClosed) {
      throw new BadRequestException("Conversation is closed");
    }
    const senderEmployeeId = scope.unrestricted
      ? dto.senderEmployeeId
      : scope.employeeId;
    const senderCustomerContactId = scope.unrestricted
      ? dto.senderCustomerContactId
      : scope.customerContactId;
    await this.assertMessageSender(workspaceId, {
      ...dto,
      senderEmployeeId,
      senderCustomerContactId,
    });

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          workspaceId,
          conversationId,
          senderUserId: senderEmployeeId || senderCustomerContactId ? undefined : user.id,
          senderEmployeeId,
          senderCustomerContactId,
          senderName: dto.senderName?.trim() ?? user.email,
          body: dto.body.trim(),
          visibility:
            scope.customerContactId && !scope.unrestricted
              ? MessageVisibility.CLIENT_VISIBLE
              : (dto.visibility ?? MessageVisibility.CLIENT_VISIBLE),
        },
        include: { attachments: true },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const notifications = await this.buildMessageNotifications(workspaceId, conversationId, message.id, dto.body);
      if (notifications.length) {
        await tx.notification.createMany({ data: notifications });
      }

      return message;
    });
  }

  async addMessageAttachment(
    workspaceId: string,
    user: AuthenticatedUser,
    messageId: string,
    dto: CreateMessageAttachmentDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    await this.prisma.message.findFirstOrThrow({
      where: {
        id: messageId,
        workspaceId,
        deletedAt: null,
        conversation: { AND: [this.access.conversationWhere(scope)] },
      },
    });

    return this.prisma.messageAttachment.create({
      data: {
        workspaceId,
        messageId,
        url: dto.url,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });
  }

  async deleteMessage(workspaceId: string, user: AuthenticatedUser, id: string) {
    const scope = await this.access.getScope(workspaceId, user);
    const where: Prisma.MessageWhereInput = scope.unrestricted
      ? { id, workspaceId }
      : { id, workspaceId, senderUserId: user.id };
    await this.prisma.message.findFirstOrThrow({ where });
    return this.prisma.message.update({
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
    });
  }

  async listNotifications(workspaceId: string, user: AuthenticatedUser, query: ListNotificationsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["title", "body"]);
    const where = {
      workspaceId,
      OR: [{ userId: user.id }, { userId: null, employeeId: null, customerContactId: null }],
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(search ? { AND: [{ OR: search }] } : {}),
    };

    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { workspaceId, userId: user.id, status: NotificationStatus.UNREAD },
      }),
    ]);

    return { data, meta: { skip, take, total, unread } };
  }

  async createNotification(
    workspaceId: string,
    user: AuthenticatedUser,
    dto: CreateNotificationDto,
  ) {
    const scope = await this.access.getScope(workspaceId, user);
    this.access.assertUnrestricted(scope);
    return this.prisma.notification.create({
      data: {
        workspaceId,
        userId: dto.userId,
        employeeId: dto.employeeId,
        customerContactId: dto.customerContactId,
        type: dto.type,
        channel: dto.channel ?? NotificationChannel.IN_APP,
        title: dto.title.trim(),
        body: dto.body,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
  }

  readNotification(workspaceId: string, user: AuthenticatedUser, id: string) {
    return this.prisma.notification.update({
      where: { id, workspaceId, userId: user.id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async readAllNotifications(workspaceId: string, user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { workspaceId, userId: user.id, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });

    return { updated: result.count };
  }

  getDeliveryConfig() {
    const emailFrom = this.configService.get<string>("EMAIL_FROM");
    const smtpConfigured = Boolean(this.configService.get<string>("SMTP_HOST") && emailFrom);
    const providerConfigured = Boolean(this.configService.get<string>("MAIL_PROVIDER") && emailFrom);

    return {
      inApp: true,
      emailConfigured: smtpConfigured || providerConfigured,
      smsConfigured: false,
      pushConfigured: false,
    };
  }

  private conversationInclude(withMessages: boolean) {
    return {
      customer: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
      serviceRequest: { select: { id: true, requestNumber: true, title: true } },
      workOrder: { select: { id: true, workOrderNumber: true, title: true } },
      participants: { orderBy: { createdAt: "asc" as const } },
      _count: { select: { messages: true } },
      ...(withMessages
        ? {
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" as const },
              take: 25,
              include: { attachments: true },
            },
          }
        : {}),
    };
  }

  private async assertConversationRelations(workspaceId: string, dto: CreateConversationDto | UpdateConversationDto) {
    if (dto.customerId) {
      await this.prisma.customer.findFirstOrThrow({ where: { id: dto.customerId, workspaceId, deletedAt: null } });
    }
    if (dto.facilityId) {
      await this.prisma.facility.findFirstOrThrow({ where: { id: dto.facilityId, workspaceId } });
    }
    if (dto.serviceRequestId) {
      await this.prisma.serviceRequest.findFirstOrThrow({ where: { id: dto.serviceRequestId, workspaceId } });
    }
    if (dto.workOrderId) {
      await this.prisma.workOrder.findFirstOrThrow({ where: { id: dto.workOrderId, workspaceId } });
    }
  }

  private async assertParticipantRelations(workspaceId: string, dto: CreateConversationParticipantDto) {
    if (dto.userId) await this.prisma.user.findUniqueOrThrow({ where: { id: dto.userId } });
    if (dto.employeeId) await this.prisma.employee.findFirstOrThrow({ where: { id: dto.employeeId, workspaceId } });
    if (dto.customerContactId) {
      await this.prisma.customerContact.findFirstOrThrow({ where: { id: dto.customerContactId, workspaceId } });
    }
  }

  private async assertMessageSender(workspaceId: string, dto: CreateConversationMessageDto) {
    if (dto.senderEmployeeId) {
      await this.prisma.employee.findFirstOrThrow({ where: { id: dto.senderEmployeeId, workspaceId } });
    }
    if (dto.senderCustomerContactId) {
      await this.prisma.customerContact.findFirstOrThrow({ where: { id: dto.senderCustomerContactId, workspaceId } });
    }
  }

  private async buildMessageNotifications(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    body: string,
  ) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { workspaceId, conversationId, userId: { not: null } },
      select: { userId: true },
    });

    return participants
      .filter((participant): participant is { userId: string } => Boolean(participant.userId))
      .map((participant) => ({
        workspaceId,
        userId: participant.userId,
        type: NotificationType.MESSAGE,
        channel: NotificationChannel.IN_APP,
        title: "New message",
        body: body.slice(0, 240),
        entityType: AttachmentEntityType.MESSAGE,
        entityId: messageId,
      }));
  }
}
