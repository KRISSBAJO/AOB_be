import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BackgroundJob,
  BackgroundJobStatus,
  BackgroundJobType,
  Prisma,
} from "@prisma/client";
import nodemailer from "nodemailer";

import { PrismaService } from "../prisma/prisma.service";

type EmailPayload = {
  template?: string;
  ready?: boolean;
  to?: string;
  subject?: string;
  firstName?: string;
  lastName?: string;
  orderNumber?: string;
  serviceName?: string;
  serviceLine?: string;
  statusUrl?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  facilityName?: string;
  requestedStartAt?: string;
};

@Injectable()
export class EmailDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<string>("BACKGROUND_JOBS_DISABLED") === "true") {
      return;
    }

    const intervalMs = Number(
      this.configService.get<number>("EMAIL_DELIVERY_POLL_MS") ?? 30_000,
    );
    this.timer = setInterval(() => {
      void this.processQueuedEmailJobs().catch((error: unknown) => {
        this.logger.error(
          error instanceof Error ? error.message : String(error),
        );
      });
    }, intervalMs);
    this.timer.unref();

    void this.processQueuedEmailJobs().catch((error: unknown) => {
      this.logger.error(error instanceof Error ? error.message : String(error));
    });
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processQueuedEmailJobs(limit = 10) {
    if (!this.smtpConfigured()) {
      return { processed: 0, skipped: "smtp-not-configured" };
    }

    const jobs = await this.prisma.backgroundJob.findMany({
      where: {
        type: BackgroundJobType.EMAIL_DELIVERY,
        status: BackgroundJobStatus.QUEUED,
        runAt: { lte: new Date() },
        payload: { path: ["ready"], equals: true },
      },
      orderBy: { runAt: "asc" },
      take: limit,
    });

    for (const job of jobs) {
      await this.processJob(job);
    }

    return { processed: jobs.length };
  }

  private async processJob(job: BackgroundJob) {
    const locked = await this.prisma.backgroundJob.updateMany({
      where: {
        id: job.id,
        status: BackgroundJobStatus.QUEUED,
      },
      data: {
        status: BackgroundJobStatus.RUNNING,
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    if (!locked.count) return;

    const attempts = job.attempts + 1;

    try {
      await this.sendEmail(this.parsePayload(job.payload));
      await this.prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: BackgroundJobStatus.SUCCEEDED,
          finishedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = attempts >= job.maxAttempts;

      await this.prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: exhausted
            ? BackgroundJobStatus.FAILED
            : BackgroundJobStatus.QUEUED,
          lockedAt: null,
          lastError: message,
          runAt: exhausted ? job.runAt : this.nextRetryAt(attempts),
        },
      });
    }
  }

  private async sendEmail(payload: EmailPayload) {
    if (!payload.to) {
      throw new Error("Email job is missing recipient");
    }

    const from = this.configService.get<string>("EMAIL_FROM");
    if (!from) {
      throw new Error("EMAIL_FROM is required for email delivery");
    }

    const message = this.renderEmail(payload);
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: Number(this.configService.get<number>("SMTP_PORT") ?? 587),
      secure: this.smtpSecure(),
      auth: this.smtpAuth(),
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject ?? message.subject,
      text: message.text,
      html: message.html,
    });
  }

  private renderEmail(payload: EmailPayload) {
    if (payload.template === "PUBLIC_SERVICE_BOOKING_CONFIRMATION") {
      const subject =
        payload.subject ?? `AOG Services booking ${payload.orderNumber}`;
      const text = [
        `Hi ${payload.firstName ?? "there"},`,
        "",
        `We received your AOG Services request${payload.orderNumber ? ` (${payload.orderNumber})` : ""}.`,
        payload.serviceName ? `Service: ${payload.serviceName}` : undefined,
        payload.statusUrl ? `Track status: ${payload.statusUrl}` : undefined,
        "",
        "Our operations team will review the details and contact you.",
      ]
        .filter(Boolean)
        .join("\n");

      return { subject, text, html: this.basicHtml(subject, text) };
    }

    if (payload.template === "PUBLIC_SERVICE_BOOKING_INTERNAL_ALERT") {
      const subject =
        payload.subject ?? `New AOG service booking ${payload.orderNumber}`;
      const text = [
        `New public service booking: ${payload.orderNumber}`,
        "",
        `Customer: ${payload.customerName ?? `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim()}`,
        payload.serviceName ? `Service: ${payload.serviceName}` : undefined,
        payload.facilityName ? `Facility: ${payload.facilityName}` : undefined,
        payload.email ? `Email: ${payload.email}` : undefined,
        payload.phone ? `Phone: ${payload.phone}` : undefined,
        payload.requestedStartAt
          ? `Requested start: ${payload.requestedStartAt}`
          : undefined,
        payload.statusUrl ? `Status: ${payload.statusUrl}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");

      return { subject, text, html: this.basicHtml(subject, text) };
    }

    const subject = payload.subject ?? "AOG Services notification";
    const text = payload.serviceName ?? payload.orderNumber ?? subject;
    return { subject, text, html: this.basicHtml(subject, text) };
  }

  private basicHtml(subject: string, text: string) {
    const paragraphs = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${this.escapeHtml(line)}</p>`)
      .join("");

    return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>${this.escapeHtml(subject)}</h2>${paragraphs}</div>`;
  }

  private parsePayload(payload: Prisma.JsonValue): EmailPayload {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Email job payload must be an object");
    }

    return payload as EmailPayload;
  }

  private smtpConfigured() {
    return Boolean(
      this.configService.get<string>("SMTP_HOST") &&
      this.configService.get<string>("EMAIL_FROM"),
    );
  }

  private smtpAuth() {
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    return user && pass ? { user, pass } : undefined;
  }

  private smtpSecure() {
    const value = this.configService.get<string>("SMTP_SECURE");
    if (value === undefined || value === "") {
      return Number(this.configService.get<number>("SMTP_PORT") ?? 587) === 465;
    }
    return value === "true";
  }

  private nextRetryAt(attempts: number) {
    const delayMinutes = Math.min(60, Math.max(1, attempts * attempts));
    return new Date(Date.now() + delayMinutes * 60_000);
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}
