import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { EmailDeliveryService } from "./email-delivery.service";

@Module({
  imports: [PrismaModule],
  providers: [EmailDeliveryService],
  exports: [EmailDeliveryService],
})
export class JobsModule {}
