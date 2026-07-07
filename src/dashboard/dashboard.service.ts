import { Injectable } from "@nestjs/common";
import {
  ComplaintStatus,
  IncidentStatus,
  InspectionStatus,
  InvoiceStatus,
  PaymentStatus,
  ServiceRequestStatus,
  WorkOrderStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { DashboardRangeQueryDto, DashboardWorkOrdersQueryDto } from "./dto/dashboard-query.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(workspaceId: string, query: DashboardRangeQueryDto) {
    const range = this.dateRange(query);
    const now = new Date();
    const [
      customers,
      facilities,
      openServiceRequests,
      activeWorkOrders,
      failedInspections,
      openComplaints,
      openIncidents,
      overdueInvoices,
      revenue,
      recentWorkOrders,
      recentAudit,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { workspaceId, deletedAt: null, status: "ACTIVE" } }),
      this.prisma.facility.count({ where: { workspaceId, status: "ACTIVE" } }),
      this.prisma.serviceRequest.count({
        where: {
          workspaceId,
          status: { notIn: [ServiceRequestStatus.COMPLETED, ServiceRequestStatus.CANCELLED, ServiceRequestStatus.INVOICED] },
          createdAt: range,
        },
      }),
      this.prisma.workOrder.count({
        where: {
          workspaceId,
          status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
          createdAt: range,
        },
      }),
      this.prisma.inspection.count({
        where: { workspaceId, status: { in: [InspectionStatus.FAILED, InspectionStatus.NEEDS_CORRECTION] }, createdAt: range },
      }),
      this.prisma.complaint.count({
        where: { workspaceId, status: { in: [ComplaintStatus.OPEN, ComplaintStatus.UNDER_REVIEW] }, createdAt: range },
      }),
      this.prisma.incident.count({
        where: { workspaceId, status: { in: [IncidentStatus.OPEN, IncidentStatus.UNDER_REVIEW] }, createdAt: range },
      }),
      this.prisma.invoice.count({
        where: {
          workspaceId,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
          dueDate: { lt: now },
          balanceDue: { gt: 0 },
        },
      }),
      this.prisma.payment.aggregate({
        where: { workspaceId, status: PaymentStatus.SUCCEEDED, paidAt: range },
        _sum: { amount: true },
      }),
      this.prisma.workOrder.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: {
          customer: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      }),
    ]);

    return {
      kpis: {
        customers,
        facilities,
        openServiceRequests,
        activeWorkOrders,
        failedInspections,
        openComplaints,
        openIncidents,
        overdueInvoices,
        revenue: revenue._sum.amount ?? 0,
      },
      recentWorkOrders,
      recentActivity: recentAudit,
    };
  }

  async workOrders(workspaceId: string, query: DashboardWorkOrdersQueryDto) {
    const range = this.dateRange(query);
    const where = {
      workspaceId,
      ...(query.serviceLine ? { serviceLine: query.serviceLine as never } : {}),
      ...(Object.keys(range).length ? { createdAt: range } : {}),
    };

    const [byStatus, byPriority, upcoming, overdue] = await Promise.all([
      this.prisma.workOrder.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      this.prisma.workOrder.groupBy({
        by: ["priority"],
        where,
        _count: { _all: true },
      }),
      this.prisma.workOrder.findMany({
        where: {
          ...where,
          scheduledStartAt: { gte: new Date() },
          status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
        },
        orderBy: { scheduledStartAt: "asc" },
        take: 10,
        include: { customer: { select: { id: true, name: true } }, facility: { select: { id: true, name: true } } },
      }),
      this.prisma.workOrder.findMany({
        where: {
          ...where,
          scheduledEndAt: { lt: new Date() },
          status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
        },
        orderBy: { scheduledEndAt: "asc" },
        take: 10,
        include: { customer: { select: { id: true, name: true } }, facility: { select: { id: true, name: true } } },
      }),
    ]);

    return { byStatus, byPriority, upcoming, overdue };
  }

  async revenue(workspaceId: string, query: DashboardRangeQueryDto) {
    const range = this.dateRange(query, 180);
    const [payments, openInvoices, overdueInvoices] = await Promise.all([
      this.prisma.payment.findMany({
        where: { workspaceId, status: PaymentStatus.SUCCEEDED, paidAt: range },
        orderBy: { paidAt: "asc" },
        select: { amount: true, paidAt: true, method: true },
      }),
      this.prisma.invoice.aggregate({
        where: { workspaceId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.VOID, InvoiceStatus.CANCELLED] } },
        _sum: { balanceDue: true },
        _count: { _all: true },
      }),
      this.prisma.invoice.aggregate({
        where: { workspaceId, dueDate: { lt: new Date() }, balanceDue: { gt: 0 } },
        _sum: { balanceDue: true },
        _count: { _all: true },
      }),
    ]);

    const monthly = new Map<string, number>();
    for (const payment of payments) {
      const paidAt = payment.paidAt ?? new Date();
      const key = `${paidAt.getUTCFullYear()}-${String(paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
      monthly.set(key, (monthly.get(key) ?? 0) + Number(payment.amount));
    }

    return {
      monthly: [...monthly.entries()].map(([month, amount]) => ({ month, amount })),
      openInvoices,
      overdueInvoices,
      payments,
    };
  }

  private dateRange(query: DashboardRangeQueryDto, defaultDays?: number) {
    const fallbackFrom = defaultDays ? new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000) : undefined;
    return {
      ...(query.from ? { gte: new Date(query.from) } : fallbackFrom ? { gte: fallbackFrom } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }
}
