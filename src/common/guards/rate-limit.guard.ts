import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.originalUrl ?? request.url;
    if (path.startsWith("/api/health") || path.startsWith("/docs")) return true;

    const windowMs = this.configService.get<number>("RATE_LIMIT_WINDOW_MS", 60_000);
    const max = this.configService.get<number>("RATE_LIMIT_MAX", 600);
    const now = Date.now();
    const key = `${request.ip ?? request.socket.remoteAddress ?? "unknown"}:${request.method}`;
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      this.cleanup(now);
      return true;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      throw new HttpException("Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private cleanup(now: number) {
    if (this.buckets.size < 1_000) return;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
