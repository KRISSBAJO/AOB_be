import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AttachmentEntityType,
  BackgroundJobType,
  Customer,
  CustomerContact,
  CustomerStatus,
  CustomerType,
  Facility,
  FacilityType,
  NotificationChannel,
  NotificationType,
  Prisma,
  ServiceLine,
  ServiceRequest,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import {
  CreatePublicServiceBookingDto,
  LookupPublicServiceBookingDto,
} from "./dto/public-booking.dto";

type PublicBookingContext = {
  ipAddress?: string;
  userAgent?: string;
};

type BookingWithRelations = ServiceRequest & {
  customer: Pick<Customer, "name">;
  facility: Pick<Facility, "name" | "city" | "state"> | null;
  requestedByContact: Pick<
    CustomerContact,
    "firstName" | "lastName" | "email" | "phone"
  > | null;
  workOrders: Array<{ workOrderNumber: string; status: string }>;
  statusHistory: Array<{
    toStatus: ServiceRequestStatus;
    note: string | null;
    createdAt: Date;
  }>;
};

@Injectable()
export class PublicBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreatePublicServiceBookingDto,
    context: PublicBookingContext,
  ) {
    const workspaceId = await this.resolveWorkspaceId();
    const email = this.normalizeEmail(dto.email);
    const phone = this.requireClean(dto.phone);
    const firstName = this.requireClean(dto.firstName);
    const lastName = this.requireClean(dto.lastName);
    const company = this.clean(dto.company);
    const serviceName =
      this.clean(dto.serviceType) || this.serviceLineLabel(dto.serviceLine);
    const title = `${serviceName} request`;
    const requestedStartAt = dto.requestedStartAt
      ? new Date(dto.requestedStartAt)
      : undefined;

    const serviceRequest = await this.prisma.$transaction(async (tx) => {
      const customer = await this.findOrCreateCustomer(tx, workspaceId, {
        company,
        email,
        phone,
        firstName,
        lastName,
        dto,
      });
      const contact = await this.findOrCreateContact(
        tx,
        workspaceId,
        customer.id,
        {
          firstName,
          lastName,
          email,
          phone,
          serviceLine: dto.serviceLine,
        },
      );
      const facility = await this.findOrCreateFacility(
        tx,
        workspaceId,
        customer.id,
        dto,
      );
      const orderNumber = await this.generateOrderNumber(tx, workspaceId);

      const created = await tx.serviceRequest.create({
        data: {
          workspaceId,
          requestNumber: orderNumber,
          customerId: customer.id,
          facilityId: facility?.id,
          requestedByContactId: contact.id,
          title,
          description: this.buildDescription(
            dto,
            firstName,
            lastName,
            email,
            phone,
          ),
          serviceLine: dto.serviceLine,
          priority: this.priorityFor(dto.serviceLine, dto.message),
          status: ServiceRequestStatus.SUBMITTED,
          requestedStartAt,
          preferredTimeWindow: this.clean(dto.preferredTimeWindow),
        },
      });

      await tx.serviceRequestItem.create({
        data: {
          workspaceId,
          serviceRequestId: created.id,
          serviceName,
          description: this.clean(dto.message),
          quantity: 1,
        },
      });

      await tx.serviceRequestStatusHistory.create({
        data: {
          workspaceId,
          serviceRequestId: created.id,
          toStatus: ServiceRequestStatus.SUBMITTED,
          note: "Public booking submitted",
        },
      });

      await tx.notification.create({
        data: {
          workspaceId,
          type: NotificationType.SERVICE_REQUEST,
          channel: NotificationChannel.IN_APP,
          title: `New service booking ${orderNumber}`,
          body: `${customer.name} requested ${this.serviceLineLabel(dto.serviceLine)} service.`,
          entityType: AttachmentEntityType.SERVICE_REQUEST,
          entityId: created.id,
        },
      });

      const emailReady = this.emailDeliveryConfigured();
      const statusUrl = this.publicStatusUrl(orderNumber);
      const internalEmail = this.internalBookingEmail();

      await tx.backgroundJob.create({
        data: {
          workspaceId,
          type: BackgroundJobType.EMAIL_DELIVERY,
          payload: {
            template: "PUBLIC_SERVICE_BOOKING_CONFIRMATION",
            ready: emailReady,
            requiresConfiguredMailer: !emailReady,
            to: email,
            subject: `AOG Services booking ${orderNumber}`,
            orderNumber,
            firstName,
            lastName,
            serviceLine: dto.serviceLine,
            serviceName,
            statusUrl,
          } as Prisma.InputJsonValue,
        },
      });

      if (internalEmail) {
        await tx.notification.create({
          data: {
            workspaceId,
            type: NotificationType.SERVICE_REQUEST,
            channel: NotificationChannel.EMAIL,
            title: `New service booking ${orderNumber}`,
            body: `${firstName} ${lastName} requested ${serviceName}. Email: ${email}. Phone: ${phone}.`,
            entityType: AttachmentEntityType.SERVICE_REQUEST,
            entityId: created.id,
          },
        });

        await tx.backgroundJob.create({
          data: {
            workspaceId,
            type: BackgroundJobType.EMAIL_DELIVERY,
            payload: {
              template: "PUBLIC_SERVICE_BOOKING_INTERNAL_ALERT",
              ready: emailReady,
              requiresConfiguredMailer: !emailReady,
              to: internalEmail,
              subject: `New AOG service booking ${orderNumber}`,
              orderNumber,
              customerName: customer.name,
              firstName,
              lastName,
              email,
              phone,
              serviceLine: dto.serviceLine,
              serviceName,
              facilityName: this.clean(dto.facilityName),
              requestedStartAt: requestedStartAt?.toISOString(),
              statusUrl,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          workspaceId,
          action: "POST public-service-booking",
          entityType: "service-booking",
          entityId: created.id,
          metadata: {
            orderNumber,
            serviceLine: dto.serviceLine,
            source: "landing-page",
          } as Prisma.InputJsonValue,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return tx.serviceRequest.findUniqueOrThrow({
        where: { id: created.id },
        include: this.publicInclude(),
      });
    });

    return {
      orderNumber: serviceRequest.requestNumber,
      status: this.publicStatus(serviceRequest.status),
      statusCode: serviceRequest.status,
      message:
        "Your service booking was received. Use this order number to check status.",
      requestedStartAt: serviceRequest.requestedStartAt,
      createdAt: serviceRequest.createdAt,
      statusUrl: this.publicStatusUrl(serviceRequest.requestNumber),
    };
  }

  async lookup(dto: LookupPublicServiceBookingDto) {
    const orderNumber = this.requireClean(dto.orderNumber).toUpperCase();
    const lastName = this.requireClean(dto.lastName).toLowerCase();
    const emailOrPhone = this.requireClean(dto.emailOrPhone).toLowerCase();
    const verifierDigits = this.normalizePhone(emailOrPhone);

    const candidates = await this.prisma.serviceRequest.findMany({
      where: { requestNumber: orderNumber },
      include: this.publicInclude(),
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const serviceRequest = candidates.find((candidate) => {
      const contact = candidate.requestedByContact;
      if (!contact || contact.lastName.trim().toLowerCase() !== lastName) {
        return false;
      }

      const contactEmail = contact.email?.trim().toLowerCase();
      const contactPhone = this.normalizePhone(contact.phone);

      return (
        (!!contactEmail && contactEmail === emailOrPhone) ||
        (!!verifierDigits && !!contactPhone && contactPhone === verifierDigits)
      );
    });

    if (!serviceRequest) {
      throw new NotFoundException(
        "Booking was not found for the details provided",
      );
    }

    return this.toPublicStatusResponse(serviceRequest);
  }

  private async resolveWorkspaceId() {
    const configuredWorkspaceId = this.configService
      .get<string>("PUBLIC_BOOKING_WORKSPACE_ID")
      ?.trim();
    if (configuredWorkspaceId) {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: configuredWorkspaceId, isActive: true },
        select: { id: true },
      });
      if (!workspace) {
        throw new BadRequestException(
          "PUBLIC_BOOKING_WORKSPACE_ID does not match an active workspace",
        );
      }
      return workspace.id;
    }

    const fallback = await this.prisma.workspace.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!fallback) {
      throw new BadRequestException(
        "Public booking workspace is not configured",
      );
    }

    return fallback.id;
  }

  private async findOrCreateCustomer(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    input: {
      company?: string;
      email: string;
      phone: string;
      firstName: string;
      lastName: string;
      dto: CreatePublicServiceBookingDto;
    },
  ) {
    const existing = await tx.customer.findFirst({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [{ billingEmail: input.email }, { phone: input.phone }],
      },
      orderBy: { updatedAt: "desc" },
    });

    const name = input.company || `${input.firstName} ${input.lastName}`;
    const common = {
      name,
      billingEmail: input.email,
      phone: input.phone,
      addressLine1: this.clean(input.dto.addressLine1),
      addressLine2: this.clean(input.dto.addressLine2),
      city: this.clean(input.dto.city),
      state: this.clean(input.dto.state),
      postalCode: this.clean(input.dto.postalCode),
      country: this.clean(input.dto.country) || "US",
      notes: "Created from public service booking.",
    };

    if (existing) {
      return tx.customer.update({
        where: { id: existing.id },
        data: {
          ...common,
          status:
            existing.status === CustomerStatus.ARCHIVED
              ? CustomerStatus.LEAD
              : existing.status,
        },
      });
    }

    return tx.customer.create({
      data: {
        workspaceId,
        ...common,
        type: input.company ? CustomerType.COMPANY : CustomerType.INDIVIDUAL,
        status: CustomerStatus.LEAD,
      },
    });
  }

  private async findOrCreateContact(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    customerId: string,
    input: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      serviceLine: ServiceLine;
    },
  ) {
    const existing = await tx.customerContact.findFirst({
      where: {
        workspaceId,
        customerId,
        OR: [{ email: input.email }, { phone: input.phone }],
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      isPrimary: true,
      notes: `Public booking contact for ${this.serviceLineLabel(input.serviceLine)}.`,
    };

    if (existing) {
      return tx.customerContact.update({
        where: { id: existing.id },
        data,
      });
    }

    return tx.customerContact.create({
      data: {
        workspaceId,
        customerId,
        ...data,
      },
    });
  }

  private async findOrCreateFacility(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    customerId: string,
    dto: CreatePublicServiceBookingDto,
  ) {
    const hasFacilityInput = [
      dto.facilityName,
      dto.addressLine1,
      dto.city,
      dto.state,
      dto.postalCode,
    ].some((value) => Boolean(this.clean(value)));

    if (!hasFacilityInput) {
      return undefined;
    }

    const name =
      this.clean(dto.facilityName) ||
      `${this.clean(dto.company) || "Customer"} site`;
    const addressLine1 = this.clean(dto.addressLine1);

    const existing = await tx.facility.findFirst({
      where: {
        workspaceId,
        customerId,
        name,
        ...(addressLine1 ? { addressLine1 } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    return tx.facility.create({
      data: {
        workspaceId,
        customerId,
        name,
        type: this.facilityTypeFor(dto.serviceLine),
        addressLine1,
        addressLine2: this.clean(dto.addressLine2),
        city: this.clean(dto.city),
        state: this.clean(dto.state),
        postalCode: this.clean(dto.postalCode),
        country: this.clean(dto.country) || "US",
        notes: "Created from public service booking.",
      },
    });
  }

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
    workspaceId: string,
  ) {
    const prefix = this.monthlyPrefix();
    let sequence =
      (await tx.serviceRequest.count({
        where: { workspaceId, requestNumber: { startsWith: prefix } },
      })) + 1;

    while (true) {
      const requestNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const existing = await tx.serviceRequest.findUnique({
        where: { workspaceId_requestNumber: { workspaceId, requestNumber } },
      });
      if (!existing) return requestNumber;
      sequence += 1;
    }
  }

  private toPublicStatusResponse(serviceRequest: BookingWithRelations) {
    return {
      orderNumber: serviceRequest.requestNumber,
      status: this.publicStatus(serviceRequest.status),
      statusCode: serviceRequest.status,
      nextStep: this.publicNextStep(serviceRequest.status),
      serviceLine: serviceRequest.serviceLine,
      title: serviceRequest.title,
      requestedStartAt: serviceRequest.requestedStartAt,
      preferredTimeWindow: serviceRequest.preferredTimeWindow,
      createdAt: serviceRequest.createdAt,
      updatedAt: serviceRequest.updatedAt,
      customerName: serviceRequest.customer.name,
      facility: serviceRequest.facility
        ? {
            name: serviceRequest.facility.name,
            city: serviceRequest.facility.city,
            state: serviceRequest.facility.state,
          }
        : null,
      workOrders: serviceRequest.workOrders.map((workOrder) => ({
        workOrderNumber: workOrder.workOrderNumber,
        status: workOrder.status,
      })),
      timeline: serviceRequest.statusHistory.map((event) => ({
        status: this.publicStatus(event.toStatus),
        statusCode: event.toStatus,
        note: event.note,
        at: event.createdAt,
      })),
    };
  }

  private publicInclude() {
    return {
      customer: { select: { name: true } },
      facility: { select: { name: true, city: true, state: true } },
      requestedByContact: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
      workOrders: {
        select: { workOrderNumber: true, status: true },
        orderBy: { createdAt: "desc" as const },
      },
      statusHistory: {
        select: { toStatus: true, note: true, createdAt: true },
        orderBy: { createdAt: "asc" as const },
      },
    };
  }

  private buildDescription(
    dto: CreatePublicServiceBookingDto,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
  ) {
    return [
      `Public booking submitted by ${firstName} ${lastName}.`,
      `Contact: ${email} | ${phone}`,
      dto.company ? `Company: ${this.clean(dto.company)}` : undefined,
      dto.facilityName
        ? `Facility: ${this.clean(dto.facilityName)}`
        : undefined,
      dto.addressLine1 ? `Address: ${this.clean(dto.addressLine1)}` : undefined,
      dto.city || dto.state || dto.postalCode
        ? `Location: ${[dto.city, dto.state, dto.postalCode]
            .map((value) => this.clean(value))
            .filter(Boolean)
            .join(", ")}`
        : undefined,
      dto.preferredTimeWindow
        ? `Preferred window: ${this.clean(dto.preferredTimeWindow)}`
        : undefined,
      `Details: ${this.clean(dto.message)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private priorityFor(serviceLine: ServiceLine, message: string) {
    const text = message.toLowerCase();
    if (
      text.includes("emergency") ||
      text.includes("urgent") ||
      text.includes("asap")
    ) {
      return ServiceRequestPriority.URGENT;
    }
    if (serviceLine === ServiceLine.SECURITY) {
      return ServiceRequestPriority.HIGH;
    }
    return ServiceRequestPriority.NORMAL;
  }

  private facilityTypeFor(serviceLine: ServiceLine) {
    if (serviceLine === ServiceLine.PARKING) return FacilityType.PARKING_LOT;
    if (serviceLine === ServiceLine.EVENT_SETUP)
      return FacilityType.EVENT_VENUE;
    return FacilityType.OFFICE;
  }

  private publicStatus(status: ServiceRequestStatus) {
    const labels: Record<ServiceRequestStatus, string> = {
      DRAFT: "Draft",
      SUBMITTED: "Received",
      UNDER_REVIEW: "Under review",
      APPROVED: "Approved",
      REJECTED: "Closed",
      SCHEDULED: "Scheduled",
      ASSIGNED: "Assigned",
      IN_PROGRESS: "In progress",
      ON_HOLD: "On hold",
      QA_REVIEW: "Quality review",
      CUSTOMER_REVIEW: "Customer review",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      INVOICED: "Completed",
    };
    return labels[status];
  }

  private publicNextStep(status: ServiceRequestStatus) {
    switch (status) {
      case ServiceRequestStatus.SUBMITTED:
      case ServiceRequestStatus.UNDER_REVIEW:
        return "Our operations team is reviewing the details and will contact you.";
      case ServiceRequestStatus.APPROVED:
      case ServiceRequestStatus.SCHEDULED:
      case ServiceRequestStatus.ASSIGNED:
        return "Your service is being scheduled or assigned.";
      case ServiceRequestStatus.IN_PROGRESS:
        return "The service team is working on this request.";
      case ServiceRequestStatus.QA_REVIEW:
      case ServiceRequestStatus.CUSTOMER_REVIEW:
        return "The request is in review before closeout.";
      case ServiceRequestStatus.COMPLETED:
      case ServiceRequestStatus.INVOICED:
        return "This request has been completed.";
      case ServiceRequestStatus.REJECTED:
      case ServiceRequestStatus.CANCELLED:
        return "This request is closed. Contact support if you need more help.";
      default:
        return "Our team will update this booking as work progresses.";
    }
  }

  private serviceLineLabel(serviceLine: ServiceLine) {
    const labels: Record<ServiceLine, string> = {
      CLEANING: "Cleaning",
      SECURITY: "Security",
      PARKING: "Parking",
      EVENT_SETUP: "Event setup",
      FACILITY_SUPPORT: "Facility support",
      OTHER: "General facility",
    };
    return labels[serviceLine];
  }

  private monthlyPrefix() {
    const now = new Date();
    return `AOG-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private emailDeliveryConfigured() {
    const emailFrom = this.configService.get<string>("EMAIL_FROM");
    return Boolean(
      emailFrom &&
      (this.configService.get<string>("SMTP_HOST") ||
        this.configService.get<string>("MAIL_PROVIDER")),
    );
  }

  private internalBookingEmail() {
    return this.configService
      .get<string>("PUBLIC_BOOKING_INTERNAL_EMAIL")
      ?.trim();
  }

  private publicStatusUrl(orderNumber: string) {
    const publicAppUrl = this.configService
      .get<string>("PUBLIC_APP_URL")
      ?.trim();
    if (publicAppUrl) {
      return `${publicAppUrl.replace(/\/$/, "")}/booking-status?order=${encodeURIComponent(orderNumber)}`;
    }

    const corsOrigins = this.configService
      .get<string>("CORS_ORIGIN")
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const corsOrigin =
      corsOrigins?.find((origin) => origin.includes("localhost:3002")) ??
      corsOrigins?.[0];
    if (corsOrigin) {
      return `${corsOrigin.replace(/\/$/, "")}/booking-status?order=${encodeURIComponent(orderNumber)}`;
    }

    return `/booking-status?order=${encodeURIComponent(orderNumber)}`;
  }

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned ? cleaned.replace(/\s+/g, " ") : undefined;
  }

  private requireClean(value: string) {
    const cleaned = this.clean(value);
    if (!cleaned) {
      throw new BadRequestException("Required booking fields cannot be blank");
    }
    return cleaned;
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizePhone(value?: string | null) {
    return value?.replace(/\D/g, "") ?? "";
  }
}
