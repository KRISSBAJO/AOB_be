import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { IS_PUBLIC_ROUTE_KEY } from "../decorators/public-route.decorator";

@Injectable()
export class OptionalApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const expectedApiKey = this.configService.get<string>("API_KEY");

    if (!expectedApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedApiKey = request.header("x-api-key");

    if (providedApiKey === expectedApiKey) {
      return true;
    }

    throw new UnauthorizedException("Invalid or missing API key");
  }
}
