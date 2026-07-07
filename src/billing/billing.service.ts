import { BadRequestException, Injectable } from "@nestjs/common";
import {
  AttachmentEntityType,
  InvoiceStatus,
  NotificationChannel,
  NotificationType,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListInvoicesQueryDto, ListPaymentsQueryDto } from "./dto/billing-query.dto";
import {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
  CreatePaymentDto,
  SendInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceItemDto,
  UpdatePaymentDto,
} from "./dto/billing.dto";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices(workspaceId: string, query: ListInvoicesQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["invoiceNumber", "notes"]);
    const dueDate = {
      ...(query.dueFrom ? { gte: new Date(query.dueFrom) } : {}),
      ...(query.dueTo ? { lte: new Date(query.dueTo) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(dueDate).length ? { dueDate } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { issueDate: "desc" },
        include: this.invoiceInclude(false),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createInvoice(workspaceId: string, user: AuthenticatedUser, dto: CreateInvoiceDto) {
    await this.assertInvoiceRelations(workspaceId, dto);

    return this.prisma.invoice.create({
      data: {
        workspaceId,
        customerId: dto.customerId,
        contractId: dto.contractId,
        serviceRequestId: dto.serviceRequestId,
        createdById: user.id,
        invoiceNumber: dto.invoiceNumber?.trim() ?? (await this.generateInvoiceNumber(workspaceId)),
        status: dto.status,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        currency: dto.currency,
        notes: dto.notes,
      },
      include: this.invoiceInclude(true),
    });
  }

  getInvoice(workspaceId: string, id: string) {
    return this.prisma.invoice.findFirstOrThrow({
      where: { id, workspaceId },
      include: this.invoiceInclude(true),
    });
  }

  async updateInvoice(workspaceId: string, id: string, dto: UpdateInvoiceDto) {
    await this.assertInvoiceRelations(workspaceId, dto);

    return this.prisma.invoice.update({
      where: { id, workspaceId },
      data: {
        customerId: dto.customerId,
        contractId: dto.contractId,
        serviceRequestId: dto.serviceRequestId,
        invoiceNumber: dto.invoiceNumber?.trim(),
        status: dto.status,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        currency: dto.currency,
        notes: dto.notes,
      },
      include: this.invoiceInclude(true),
    });
  }

  async cancelInvoice(workspaceId: string, id: string) {
    return this.prisma.invoice.update({
      where: { id, workspaceId },
      data: { status: InvoiceStatus.CANCELLED },
      include: this.invoiceInclude(true),
    });
  }

  async sendInvoice(workspaceId: string, id: string, dto: SendInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirstOrThrow({
      where: { id, workspaceId },
      include: { customer: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const sent = await tx.invoice.update({
        where: { id },
        data: {
          status: invoice.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : invoice.status,
          sentAt: new Date(),
          notes: dto.note ? [invoice.notes, dto.note].filter(Boolean).join("\n") : undefined,
        },
        include: this.invoiceInclude(true),
      });

      await tx.notification.create({
        data: {
          workspaceId,
          type: NotificationType.BILLING,
          channel: NotificationChannel.IN_APP,
          title: `Invoice ${invoice.invoiceNumber} sent`,
          body: `Invoice for ${invoice.customer.name} is ready.`,
          entityType: AttachmentEntityType.INVOICE,
          entityId: invoice.id,
        },
      });

      return sent;
    });
  }

  async addInvoiceItem(workspaceId: string, invoiceId: string, dto: CreateInvoiceItemDto) {
    await this.assertInvoice(workspaceId, invoiceId);
    await this.assertInvoiceItemRelations(workspaceId, dto);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.invoiceItem.create({
        data: {
          workspaceId,
          invoiceId,
          workOrderId: dto.workOrderId,
          serviceId: dto.serviceId,
          description: dto.description.trim(),
          quantity: dto.quantity ?? 1,
          unit: dto.unit,
          unitPrice: dto.unitPrice,
          taxRate: dto.taxRate,
          lineTotal: this.calculateLineTotal(dto.quantity ?? 1, dto.unitPrice),
        },
      });
      await this.recalculateInvoiceTotals(tx, workspaceId, invoiceId);
      return item;
    });
  }

  async updateInvoiceItem(workspaceId: string, id: string, dto: UpdateInvoiceItemDto) {
    const current = await this.prisma.invoiceItem.findFirstOrThrow({ where: { id, workspaceId } });
    await this.assertInvoiceItemRelations(workspaceId, dto);
    const quantity = dto.quantity ?? Number(current.quantity);
    const unitPrice = dto.unitPrice ?? Number(current.unitPrice);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.invoiceItem.update({
        where: { id },
        data: {
          workOrderId: dto.workOrderId,
          serviceId: dto.serviceId,
          description: dto.description?.trim(),
          quantity: dto.quantity,
          unit: dto.unit,
          unitPrice: dto.unitPrice,
          taxRate: dto.taxRate,
          lineTotal: this.calculateLineTotal(quantity, unitPrice),
        },
      });
      await this.recalculateInvoiceTotals(tx, workspaceId, current.invoiceId);
      return item;
    });
  }

  async deleteInvoiceItem(workspaceId: string, id: string) {
    const current = await this.prisma.invoiceItem.findFirstOrThrow({ where: { id, workspaceId } });
    return this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.delete({ where: { id } });
      await this.recalculateInvoiceTotals(tx, workspaceId, current.invoiceId);
      return { deleted: true };
    });
  }

  async listPayments(workspaceId: string, query: ListPaymentsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["paymentNumber", "reference", "notes"]);
    const paidAt = {
      ...(query.paidFrom ? { gte: new Date(query.paidFrom) } : {}),
      ...(query.paidTo ? { lte: new Date(query.paidTo) } : {}),
    };
    const where = {
      workspaceId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(paidAt).length ? { paidAt } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: this.paymentInclude(),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: { skip, take, total } };
  }

  async createPayment(workspaceId: string, user: AuthenticatedUser, dto: CreatePaymentDto) {
    await this.assertPaymentRelations(workspaceId, dto);
    const status = dto.status ?? PaymentStatus.SUCCEEDED;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          workspaceId,
          customerId: dto.customerId,
          invoiceId: dto.invoiceId,
          receivedById: user.id,
          paymentNumber: dto.paymentNumber?.trim() ?? (await this.generatePaymentNumber(workspaceId)),
          method: dto.method,
          status,
          amount: dto.amount,
          currency: dto.currency,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : status === PaymentStatus.SUCCEEDED ? new Date() : undefined,
          reference: dto.reference,
          notes: dto.notes,
        },
        include: this.paymentInclude(),
      });
      if (dto.invoiceId) await this.recalculateInvoiceTotals(tx, workspaceId, dto.invoiceId);
      return payment;
    });
  }

  async updatePayment(workspaceId: string, id: string, dto: UpdatePaymentDto) {
    const current = await this.prisma.payment.findFirstOrThrow({ where: { id, workspaceId } });
    await this.assertPaymentRelations(workspaceId, dto);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          invoiceId: dto.invoiceId,
          paymentNumber: dto.paymentNumber?.trim(),
          method: dto.method,
          status: dto.status,
          amount: dto.amount,
          currency: dto.currency,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
          reference: dto.reference,
          notes: dto.notes,
        },
        include: this.paymentInclude(),
      });
      const invoiceIds = [current.invoiceId, dto.invoiceId].filter((invoiceId): invoiceId is string => Boolean(invoiceId));
      await Promise.all([...new Set(invoiceIds)].map((invoiceId) => this.recalculateInvoiceTotals(tx, workspaceId, invoiceId)));
      return payment;
    });
  }

  async cancelPayment(workspaceId: string, id: string) {
    const current = await this.prisma.payment.findFirstOrThrow({ where: { id, workspaceId } });
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.CANCELLED },
        include: this.paymentInclude(),
      });
      if (current.invoiceId) await this.recalculateInvoiceTotals(tx, workspaceId, current.invoiceId);
      return payment;
    });
  }

  private invoiceInclude(withDetails: boolean) {
    return {
      customer: { select: { id: true, name: true, billingEmail: true } },
      contract: { select: { id: true, contractNumber: true, title: true } },
      serviceRequest: { select: { id: true, requestNumber: true, title: true } },
      _count: { select: { items: true, payments: true } },
      ...(withDetails
        ? {
            items: { orderBy: { createdAt: "asc" as const } },
            payments: { orderBy: { createdAt: "desc" as const } },
          }
        : {}),
    };
  }

  private paymentInclude() {
    return {
      customer: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true, status: true, balanceDue: true } },
      receivedBy: { select: { id: true, displayName: true, email: true } },
    };
  }

  private async assertInvoiceRelations(workspaceId: string, dto: CreateInvoiceDto | UpdateInvoiceDto) {
    if (dto.customerId) await this.prisma.customer.findFirstOrThrow({ where: { id: dto.customerId, workspaceId, deletedAt: null } });
    if (dto.contractId) await this.prisma.contract.findFirstOrThrow({ where: { id: dto.contractId, workspaceId } });
    if (dto.serviceRequestId) await this.prisma.serviceRequest.findFirstOrThrow({ where: { id: dto.serviceRequestId, workspaceId } });
  }

  private async assertInvoiceItemRelations(workspaceId: string, dto: CreateInvoiceItemDto | UpdateInvoiceItemDto) {
    if (dto.workOrderId) await this.prisma.workOrder.findFirstOrThrow({ where: { id: dto.workOrderId, workspaceId } });
    if (dto.serviceId) await this.prisma.service.findFirstOrThrow({ where: { id: dto.serviceId, workspaceId } });
  }

  private async assertPaymentRelations(workspaceId: string, dto: CreatePaymentDto | UpdatePaymentDto) {
    if (dto.customerId) await this.prisma.customer.findFirstOrThrow({ where: { id: dto.customerId, workspaceId, deletedAt: null } });
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirstOrThrow({ where: { id: dto.invoiceId, workspaceId } });
      if (dto.customerId && invoice.customerId !== dto.customerId) {
        throw new BadRequestException("Payment customer must match the invoice customer");
      }
    }
  }

  private assertInvoice(workspaceId: string, id: string) {
    return this.prisma.invoice.findFirstOrThrow({ where: { id, workspaceId } });
  }

  private calculateLineTotal(quantity: number, unitPrice: number) {
    return Number((quantity * unitPrice).toFixed(2));
  }

  private async recalculateInvoiceTotals(tx: Prisma.TransactionClient, workspaceId: string, invoiceId: string) {
    const [items, payments] = await Promise.all([
      tx.invoiceItem.findMany({
        where: { workspaceId, invoiceId },
        select: { lineTotal: true, taxRate: true },
      }),
      tx.payment.findMany({
        where: { workspaceId, invoiceId, status: PaymentStatus.SUCCEEDED },
        select: { amount: true },
      }),
    ]);

    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const taxTotal = items.reduce((sum, item) => {
      const rate = item.taxRate === null ? 0 : Number(item.taxRate);
      return sum + Number(item.lineTotal) * (rate / 100);
    }, 0);
    const total = subtotal + taxTotal;
    const amountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balanceDue = Math.max(total - amountPaid, 0);
    const status = this.resolveInvoiceStatus(total, amountPaid, balanceDue);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        status,
        paidAt: status === InvoiceStatus.PAID ? new Date() : undefined,
      },
    });
  }

  private resolveInvoiceStatus(total: number, amountPaid: number, balanceDue: number) {
    if (total > 0 && balanceDue <= 0) return InvoiceStatus.PAID;
    if (amountPaid > 0) return InvoiceStatus.PARTIALLY_PAID;
    return undefined;
  }

  private async generateInvoiceNumber(workspaceId: string) {
    const now = new Date();
    const prefix = `INV-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    let sequence =
      (await this.prisma.invoice.count({
        where: { workspaceId, invoiceNumber: { startsWith: prefix } },
      })) + 1;

    while (true) {
      const invoiceNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const existing = await this.prisma.invoice.findUnique({
        where: { workspaceId_invoiceNumber: { workspaceId, invoiceNumber } },
      });
      if (!existing) return invoiceNumber;
      sequence += 1;
    }
  }

  private async generatePaymentNumber(workspaceId: string) {
    const now = new Date();
    const prefix = `PAY-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    let sequence =
      (await this.prisma.payment.count({
        where: { workspaceId, paymentNumber: { startsWith: prefix } },
      })) + 1;

    while (true) {
      const paymentNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const existing = await this.prisma.payment.findUnique({
        where: { workspaceId_paymentNumber: { workspaceId, paymentNumber } },
      });
      if (!existing) return paymentNumber;
      sequence += 1;
    }
  }
}
