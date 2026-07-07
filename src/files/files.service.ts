import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListAttachmentsQueryDto, ListCommentsQueryDto } from "./dto/files-query.dto";
import { CreateAttachmentDto, CreateCommentDto, UpdateCommentDto } from "./dto/files.dto";

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async listAttachments(workspaceId: string, query: ListAttachmentsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["fileName", "description", "url"]);
    const where = {
      workspaceId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.documentType ? { documentType: query.documentType } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.attachment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.attachment.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  createAttachment(workspaceId: string, user: AuthenticatedUser, dto: CreateAttachmentDto) {
    return this.prisma.attachment.create({
      data: {
        workspaceId,
        uploadedById: user.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        documentType: dto.documentType,
        url: dto.url,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        description: dto.description,
      },
      include: { uploadedBy: { select: { id: true, displayName: true, email: true } } },
    });
  }

  getAttachment(workspaceId: string, id: string) {
    return this.prisma.attachment.findFirstOrThrow({
      where: { id, workspaceId },
      include: { uploadedBy: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async deleteAttachment(workspaceId: string, id: string) {
    await this.prisma.attachment.delete({ where: { id, workspaceId } });
    return { deleted: true };
  }

  async listComments(workspaceId: string, query: ListCommentsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["body"]);
    const where = {
      workspaceId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  createComment(workspaceId: string, user: AuthenticatedUser, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        workspaceId,
        authorUserId: user.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        body: dto.body.trim(),
        internalOnly: dto.internalOnly,
      },
      include: { author: { select: { id: true, displayName: true, email: true } } },
    });
  }

  updateComment(workspaceId: string, id: string, dto: UpdateCommentDto) {
    return this.prisma.comment.update({
      where: { id, workspaceId },
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        body: dto.body?.trim(),
        internalOnly: dto.internalOnly,
      },
      include: { author: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async deleteComment(workspaceId: string, id: string) {
    await this.prisma.comment.delete({ where: { id, workspaceId } });
    return { deleted: true };
  }

  getStorageTargets() {
    const s3Bucket = this.configService.get<string>("AWS_S3_BUCKET");
    const cloudinaryCloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");

    return {
      directUrl: true,
      s3: {
        configured: Boolean(s3Bucket && this.configService.get<string>("AWS_REGION")),
        bucket: s3Bucket || null,
        region: this.configService.get<string>("AWS_REGION") || null,
      },
      cloudinary: {
        configured: Boolean(cloudinaryCloudName),
        cloudName: cloudinaryCloudName || null,
      },
    };
  }
}
