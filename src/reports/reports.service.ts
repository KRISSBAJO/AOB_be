import { Injectable } from "@nestjs/common";

import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import {
  InvoicesReportQueryDto,
  ServiceRequestsReportQueryDto,
  WorkOrdersReportQueryDto,
} from "./dto/reports-query.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async serviceRequests(workspaceId: string, query: ServiceRequestsReportQueryDto) {
    const { skip, take } = getPagination(query);
    const createdAt = this.dateRange(query);
    const search = textSearch(query.search, ["requestNumber", "title", "description"]);
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total, byStatus, byPriority] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          _count: { select: { items: true, workOrders: true, invoices: true } },
        },
      }),
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.serviceRequest.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    ]);

    return { data, summary: { byStatus, byPriority }, meta: { skip, take, total } };
  }

  async workOrders(workspaceId: string, query: WorkOrdersReportQueryDto) {
    const { skip, take } = getPagination(query);
    const createdAt = this.dateRange(query);
    const search = textSearch(query.search, ["workOrderNumber", "title", "description"]);
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total, byStatus, byServiceLine, qaCounts] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { tasks: true, assignments: true, photos: true, inspections: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.workOrder.groupBy({ by: ["serviceLine"], where, _count: { _all: true } }),
      this.prisma.workOrder.groupBy({ by: ["qaPassed"], where, _count: { _all: true } }),
    ]);

    return { data, summary: { byStatus, byServiceLine, qaCounts }, meta: { skip, take, total } };
  }

  async invoices(workspaceId: string, query: InvoicesReportQueryDto) {
    const { skip, take } = getPagination(query);
    const issueDate = this.dateRange(query);
    const search = textSearch(query.search, ["invoiceNumber", "notes"]);
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(issueDate).length ? { issueDate } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total, byStatus, totals] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { issueDate: "desc" },
        include: {
          customer: { select: { id: true, name: true, billingEmail: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.groupBy({ by: ["status"], where, _count: { _all: true }, _sum: { total: true, balanceDue: true } }),
      this.prisma.invoice.aggregate({
        where,
        _sum: { subtotal: true, taxTotal: true, total: true, amountPaid: true, balanceDue: true },
      }),
    ]);

    return { data, summary: { byStatus, totals }, meta: { skip, take, total } };
  }

  private dateRange(query: { from?: string; to?: string }) {
    return {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }
}
