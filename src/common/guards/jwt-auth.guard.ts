import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { AuthenticatedUser } from "../auth/authenticated-user";

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

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length);
    const secret = this.configService.get<string>("JWT_SECRET");

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

