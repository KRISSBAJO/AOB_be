import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/authenticated-user";

type AuditedRequest = Request & {
  user?: AuthenticatedUser;
  workspaceId?: string;
};

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REDACTED_KEYS = ["password", "token", "secret", "authorization", "apiKey", "accessKey", "refreshToken"];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    if (!WRITE_METHODS.has(request.method) || this.shouldSkip(request)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.writeAudit(request, response.statusCode, Date.now() - startedAt);
      }),
      catchError((error: unknown) => {
        void this.writeAudit(request, response.statusCode || 500, Date.now() - startedAt, error);
        return throwError(() => error);
      }),
    );
  }

  private shouldSkip(request: AuditedRequest) {
    const path = request.originalUrl ?? request.url;
    return path.includes("/health") || path.includes("/docs");
  }

  private async writeAudit(
    request: AuditedRequest,
    statusCode: number,
    durationMs: number,
    error?: unknown,
  ) {
    const path = request.originalUrl ?? request.url;
    const { entityType, entityId } = this.parseEntity(path);
    if (!request.user && !request.workspaceId) return;

    try {
      const metadata = this.sanitize({
        method: request.method,
        path,
        statusCode,
        durationMs,
        success: !error,
        error: error instanceof Error ? error.message : undefined,
      }) as Prisma.InputJsonValue;

      await this.prisma.auditLog.create({
        data: {
          workspaceId: request.workspaceId,
          actorUserId: request.user?.id,
          action: `${request.method} ${entityType}`,
          entityType,
          entityId,
          newValues: this.sanitize(request.body) as Prisma.InputJsonValue,
          metadata,
          ipAddress: request.ip,
          userAgent: request.header("user-agent"),
        },
      });
    } catch {
      // Audit logging must never block the business request.
    }
  }

  private parseEntity(path: string) {
    const cleanPath = path.split("?")[0]?.replace(/^\/api\/?/, "") ?? "";
    const segments = cleanPath.split("/").filter(Boolean);
    return {
      entityType: segments[0] ?? "unknown",
      entityId: segments[1] && !this.isActionSegment(segments[1]) ? segments[1] : undefined,
    };
  }

  private isActionSegment(segment: string) {
    return ["read-all", "send", "retry", "approve", "reject", "complete"].includes(segment);
  }

  private sanitize(value: unknown): unknown {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [
          key,
          REDACTED_KEYS.some((redacted) => key.toLowerCase().includes(redacted.toLowerCase()))
            ? "[REDACTED]"
            : this.sanitize(item),
        ]),
    );
  }
}
