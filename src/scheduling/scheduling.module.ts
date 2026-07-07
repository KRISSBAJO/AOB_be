import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { WorkspaceAccessModule } from "../common/access/workspace-access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SchedulingController } from "./scheduling.controller";
import { SchedulingService } from "./scheduling.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, WorkspaceAccessModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
})
export class SchedulingModule {}
