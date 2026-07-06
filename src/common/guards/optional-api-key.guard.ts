import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class OptionalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
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

