import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { WorkOrdersController } from "./work-orders.controller";
import { WorkOrdersService } from "./work-orders.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
