import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { WorkspaceRequest } from "../common/http/workspace-request";
import { BillingService } from "./billing.service";
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

@ApiTags("billing")
@ApiBearerAuth()
@RequirePermissions("billing.manage")
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("invoices")
  listInvoices(@Req() request: WorkspaceRequest, @Query() query: ListInvoicesQueryDto) {
    return this.billingService.listInvoices(request.workspaceId, query);
  }

  @Post("invoices")
  createInvoice(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.billingService.createInvoice(request.workspaceId, user, dto);
  }

  @Get("invoices/:id")
  getInvoice(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.billingService.getInvoice(request.workspaceId, id);
  }

  @Patch("invoices/:id")
  updateInvoice(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billingService.updateInvoice(request.workspaceId, id, dto);
  }

  @Delete("invoices/:id")
  cancelInvoice(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.billingService.cancelInvoice(request.workspaceId, id);
  }

  @Post("invoices/:id/send")
  sendInvoice(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: SendInvoiceDto) {
    return this.billingService.sendInvoice(request.workspaceId, id, dto);
  }

  @Post("invoices/:id/items")
  addInvoiceItem(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: CreateInvoiceItemDto) {
    return this.billingService.addInvoiceItem(request.workspaceId, id, dto);
  }

  @Patch("invoice-items/:id")
  updateInvoiceItem(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdateInvoiceItemDto) {
    return this.billingService.updateInvoiceItem(request.workspaceId, id, dto);
  }

  @Delete("invoice-items/:id")
  deleteInvoiceItem(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.billingService.deleteInvoiceItem(request.workspaceId, id);
  }

  @Get("payments")
  listPayments(@Req() request: WorkspaceRequest, @Query() query: ListPaymentsQueryDto) {
    return this.billingService.listPayments(request.workspaceId, query);
  }

  @Post("payments")
  createPayment(
    @Req() request: WorkspaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.billingService.createPayment(request.workspaceId, user, dto);
  }

  @Patch("payments/:id")
  updatePayment(@Req() request: WorkspaceRequest, @Param("id") id: string, @Body() dto: UpdatePaymentDto) {
    return this.billingService.updatePayment(request.workspaceId, id, dto);
  }

  @Delete("payments/:id")
  cancelPayment(@Req() request: WorkspaceRequest, @Param("id") id: string) {
    return this.billingService.cancelPayment(request.workspaceId, id);
  }
}
