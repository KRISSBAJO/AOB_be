import { Injectable } from "@nestjs/common";
import { BackgroundJobStatus } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import {
  ListAuditLogsQueryDto,
  ListBackgroundJobsQueryDto,
  ListSystemSettingsQueryDto,
} from "./dto/admin-query.dto";
import { CreateBackgroundJobDto, UpsertSystemSettingDto } from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async auditLogs(workspaceId: string, query: ListAuditLogsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["action", "entityType", "entityId", "ipAddress", "userAgent"]);
    const where = {
      workspaceId,
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" as const } } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async systemSettings(workspaceId: string, query: ListSystemSettingsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["key", "category", "description"]);
    const where = {
      workspaceId,
      ...(query.category ? { category: query.category } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.systemSetting.findMany({ where, skip, take, orderBy: [{ category: "asc" }, { key: "asc" }] }),
      this.prisma.systemSetting.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  upsertSystemSetting(workspaceId: string, key: string, dto: UpsertSystemSettingDto) {
    return this.prisma.systemSetting.upsert({
      where: { workspaceId_key: { workspaceId, key } },
      create: {
        workspaceId,
        key,
        value: dto.value as never,
        category: dto.category,
        description: dto.description,
      },
      update: {
        value: dto.value as never,
        category: dto.category,
        description: dto.description,
      },
    });
  }

  async backgroundJobs(workspaceId: string, query: ListBackgroundJobsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["lastError"]);
    const where = {
      OR: [{ workspaceId }, { workspaceId: null }],
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { AND: [{ OR: search }] } : {}),
    };

    const [data, total, byStatus] = await Promise.all([
      this.prisma.backgroundJob.findMany({ where, skip, take, orderBy: [{ status: "asc" }, { runAt: "asc" }] }),
      this.prisma.backgroundJob.count({ where }),
      this.prisma.backgroundJob.groupBy({ by: ["status"], where, _count: { _all: true } }),
    ]);

    return { data, summary: { byStatus }, meta: { skip, take, total } };
  }

  createBackgroundJob(workspaceId: string, user: AuthenticatedUser, dto: CreateBackgroundJobDto) {
    return this.prisma.backgroundJob.create({
      data: {
        workspaceId,
        type: dto.type,
        payload: {
          requestedBy: user.id,
          value: dto.payload ?? {},
        },
        maxAttempts: dto.maxAttempts,
        runAt: dto.runAt ? new Date(dto.runAt) : undefined,
      },
    });
  }

  async retryBackgroundJob(workspaceId: string, id: string) {
    const job = await this.prisma.backgroundJob.findFirstOrThrow({
      where: { id, OR: [{ workspaceId }, { workspaceId: null }] },
    });

    return this.prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: BackgroundJobStatus.QUEUED,
        attempts: 0,
        runAt: new Date(),
        lockedAt: null,
        finishedAt: null,
        lastError: null,
      },
    });
  }
}
