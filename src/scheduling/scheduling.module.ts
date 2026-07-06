import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { SchedulingController } from "./scheduling.controller";
import { SchedulingService } from "./scheduling.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
})
export class SchedulingModule {}
