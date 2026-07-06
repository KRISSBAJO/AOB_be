import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "aog-service-be",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("db")
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      database: "reachable",
      timestamp: new Date().toISOString(),
    };
  }
}

