import { BadRequestException, Injectable } from "@nestjs/common";
import { InspectionStatus, Prisma } from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
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

@Injectable()
export class QaService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(workspaceId: string, query: ListInspectionTemplatesQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["name", "description"]);
    const where = {
      workspaceId,
      ...(query.serviceLine ? { serviceLine: query.serviceLine } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search ? { OR: search } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.inspectionTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: { items: { orderBy: { sortOrder: "asc" } }, _count: { select: { inspections: true } } },
      }),
      this.prisma.inspectionTemplate.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  createTemplate(workspaceId: string, dto: CreateInspectionTemplateDto) {
    return this.prisma.inspectionTemplate.create({
      data: { ...dto, workspaceId, name: dto.name.trim() },
    });
  }

  updateTemplate(workspaceId: string, id: string, dto: UpdateInspectionTemplateDto) {
    return this.prisma.inspectionTemplate.update({
      where: { id, workspaceId },
      data: { ...dto, name: dto.name?.trim() },
    });
  }

  deactivateTemplate(workspaceId: string, id: string) {
    return this.prisma.inspectionTemplate.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  async addTemplateItem(workspaceId: string, templateId: string, dto: CreateInspectionTemplateItemDto) {
    await this.prisma.inspectionTemplate.findFirstOrThrow({ where: { id: templateId, workspaceId } });
    return this.prisma.inspectionTemplateItem.create({
      data: { ...dto, workspaceId, templateId, question: dto.question.trim() },
    });
  }

  async listInspections(workspaceId: string, query: ListInspectionsQueryDto) {
    const { skip, take } = getPagination(query);
    const where = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: this.inspectionInclude(false),
      }),
      this.prisma.inspection.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  async createInspection(workspaceId: string, user: AuthenticatedUser, dto: CreateInspectionDto) {
    await this.assertOptionalRelations(workspaceId, dto);
    return this.prisma.inspection.create({
      data: {
        ...dto,
        workspaceId,
        createdById: user.id,
        startedAt: dto.status === InspectionStatus.IN_PROGRESS ? new Date() : undefined,
      },
      include: this.inspectionInclude(true),
    });
  }

  getInspection(workspaceId: string, id: string) {
    return this.prisma.inspection.findFirstOrThrow({
      where: { id, workspaceId },
      include: this.inspectionInclude(true),
    });
  }

  async updateInspection(workspaceId: string, id: string, dto: UpdateInspectionDto) {
    await this.assertOptionalRelations(workspaceId, dto);
    return this.prisma.inspection.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        startedAt: dto.status === InspectionStatus.IN_PROGRESS ? new Date() : undefined,
      },
      include: this.inspectionInclude(true),
    });
  }

  async addResult(workspaceId: string, inspectionId: string, dto: CreateInspectionResultDto) {
    await this.prisma.inspection.findFirstOrThrow({ where: { id: inspectionId, workspaceId } });
    const templateItem = dto.templateItemId
      ? await this.prisma.inspectionTemplateItem.findFirstOrThrow({
          where: { id: dto.templateItemId, workspaceId },
        })
      : undefined;
    const question = dto.question?.trim() ?? templateItem?.question;
    if (!question) throw new BadRequestException("question is required when templateItemId is not provided");

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.inspectionItemResult.create({
        data: {
          workspaceId,
          inspectionId,
          templateItemId: dto.templateItemId,
          question,
          result: dto.result,
          score: dto.score,
          notes: dto.notes,
          photoUrl: dto.photoUrl,
        },
      });
      await this.recalculateInspectionScore(tx, workspaceId, inspectionId);
      return result;
    });
  }

  async completeInspection(workspaceId: string, id: string, dto: CompleteInspectionDto) {
    const score = await this.calculateScore(workspaceId, id);
    const passed = dto.passed ?? (score === null ? undefined : score >= 80);
    return this.prisma.inspection.update({
      where: { id, workspaceId },
      data: {
        status: passed === false ? InspectionStatus.FAILED : InspectionStatus.COMPLETED,
        score,
        passed,
        completedAt: new Date(),
        notes: dto.notes,
      },
      include: this.inspectionInclude(true),
    });
  }

  private inspectionInclude(withResults: boolean) {
    return {
      template: { select: { id: true, name: true, serviceLine: true } },
      workOrder: { select: { id: true, workOrderNumber: true, title: true } },
      serviceRequest: { select: { id: true, requestNumber: true, title: true } },
      facility: { select: { id: true, name: true } },
      inspectorEmployee: { select: { id: true, firstName: true, lastName: true } },
      ...(withResults ? { itemResults: { orderBy: { createdAt: "asc" as const } } } : {}),
    };
  }

  private async assertOptionalRelations(workspaceId: string, dto: CreateInspectionDto | UpdateInspectionDto) {
    if (dto.templateId) await this.prisma.inspectionTemplate.findFirstOrThrow({ where: { id: dto.templateId, workspaceId } });
    if (dto.workOrderId) await this.prisma.workOrder.findFirstOrThrow({ where: { id: dto.workOrderId, workspaceId } });
    if (dto.serviceRequestId) await this.prisma.serviceRequest.findFirstOrThrow({ where: { id: dto.serviceRequestId, workspaceId } });
    if (dto.facilityId) await this.prisma.facility.findFirstOrThrow({ where: { id: dto.facilityId, workspaceId } });
    if (dto.inspectorEmployeeId) await this.prisma.employee.findFirstOrThrow({ where: { id: dto.inspectorEmployeeId, workspaceId } });
  }

  private async calculateScore(workspaceId: string, inspectionId: string) {
    const results = await this.prisma.inspectionItemResult.findMany({
      where: { workspaceId, inspectionId, score: { not: null } },
      select: { score: true },
    });
    if (!results.length) return null;
    const total = results.reduce((sum, row) => sum + Number(row.score), 0);
    return Number((total / results.length).toFixed(2));
  }

  private async recalculateInspectionScore(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    inspectionId: string,
  ) {
    const results = await tx.inspectionItemResult.findMany({
      where: { workspaceId, inspectionId, score: { not: null } },
      select: { score: true },
    });
    if (!results.length) return;
    const total = results.reduce((sum, row) => sum + Number(row.score), 0);
    await tx.inspection.update({
      where: { id: inspectionId },
      data: { score: Number((total / results.length).toFixed(2)) },
    });
  }
}
