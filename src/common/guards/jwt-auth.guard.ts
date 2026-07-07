import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { AuthenticatedUser } from "../auth/authenticated-user";
import { DEFAULT_ACCESS_COOKIE_NAME, readCookie } from "../http/auth-cookies";

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : readCookie(
          request.headers.cookie,
          this.configService.get<string>("AUTH_ACCESS_COOKIE_NAME") ?? DEFAULT_ACCESS_COOKIE_NAME,
        );
    const secret = this.configService.get<string>("JWT_SECRET");

    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    if (!secret) {
      throw new UnauthorizedException("JWT is not configured");
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        isSiteAdmin?: boolean;
      }>(token, { secret });

      request.user = {
        id: payload.sub,
        email: payload.email,
        isSiteAdmin: Boolean(payload.isSiteAdmin),
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
