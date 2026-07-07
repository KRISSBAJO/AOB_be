import { Injectable } from "@nestjs/common";
import { ComplaintStatus, CorrectiveActionStatus, IncidentStatus } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import {
  ListComplaintsQueryDto,
  ListCorrectiveActionsQueryDto,
  ListIncidentsQueryDto,
} from "./dto/issues-query.dto";
import {
  CreateComplaintDto,
  CreateCorrectiveActionDto,
  CreateIncidentDto,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
  UpdateCorrectiveActionDto,
  UpdateIncidentDto,
} from "./dto/issues.dto";

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async listComplaints(workspaceId: string, query: ListComplaintsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["title", "description", "resolution"]);
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(search ? { OR: search } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: this.complaintInclude() }),
      this.prisma.complaint.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  async createComplaint(workspaceId: string, user: AuthenticatedUser, dto: CreateComplaintDto) {
    await this.assertCustomer(workspaceId, dto.customerId);
    return this.prisma.complaint.create({
      data: {
        ...dto,
        workspaceId,
        createdById: user.id,
        title: dto.title.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      include: this.complaintInclude(),
    });
  }

  updateComplaint(workspaceId: string, id: string, dto: UpdateComplaintDto) {
    return this.prisma.complaint.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        title: dto.title?.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      include: this.complaintInclude(),
    });
  }

  updateComplaintStatus(workspaceId: string, id: string, dto: UpdateComplaintStatusDto) {
    return this.prisma.complaint.update({
      where: { id, workspaceId },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt:
          dto.status === ComplaintStatus.RESOLVED || dto.status === ComplaintStatus.CLOSED
            ? new Date()
            : undefined,
      },
      include: this.complaintInclude(),
    });
  }

  async listCorrectiveActions(workspaceId: string, query: ListCorrectiveActionsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["title", "description"]);
    const where = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(search ? { OR: search } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.correctiveAction.findMany({ where, skip, take, orderBy: { dueAt: "asc" }, include: this.actionInclude() }),
      this.prisma.correctiveAction.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  createCorrectiveAction(workspaceId: string, user: AuthenticatedUser, dto: CreateCorrectiveActionDto) {
    return this.prisma.correctiveAction.create({
      data: {
        ...dto,
        workspaceId,
        createdById: user.id,
        title: dto.title.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      include: this.actionInclude(),
    });
  }

  updateCorrectiveAction(workspaceId: string, id: string, dto: UpdateCorrectiveActionDto) {
    return this.prisma.correctiveAction.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        title: dto.title?.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        completedAt: dto.status === CorrectiveActionStatus.DONE ? new Date() : undefined,
      },
      include: this.actionInclude(),
    });
  }

  async listIncidents(workspaceId: string, query: ListIncidentsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["title", "description", "resolution"]);
    const where = {
      workspaceId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { OR: search } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: this.incidentInclude() }),
      this.prisma.incident.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  createIncident(workspaceId: string, user: AuthenticatedUser, dto: CreateIncidentDto) {
    return this.prisma.incident.create({
      data: {
        ...dto,
        workspaceId,
        reportedById: user.id,
        title: dto.title.trim(),
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
      include: this.incidentInclude(),
    });
  }

  updateIncident(workspaceId: string, id: string, dto: UpdateIncidentDto) {
    return this.prisma.incident.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        title: dto.title?.trim(),
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        resolvedAt:
          dto.status === IncidentStatus.RESOLVED || dto.status === IncidentStatus.CLOSED
            ? new Date()
            : undefined,
      },
      include: this.incidentInclude(),
    });
  }

  private complaintInclude() {
    return {
      customer: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, displayName: true, email: true } },
      _count: { select: { correctiveActions: true } },
    };
  }

  private actionInclude() {
    return {
      complaint: { select: { id: true, title: true, status: true } },
      assignedTo: { select: { id: true, displayName: true, email: true } },
    };
  }

  private incidentInclude() {
    return {
      customer: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, displayName: true, email: true } },
    };
  }

  private assertCustomer(workspaceId: string, customerId: string) {
    return this.prisma.customer.findFirstOrThrow({ where: { id: customerId, workspaceId, deletedAt: null } });
  }
}
