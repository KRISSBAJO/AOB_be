import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
