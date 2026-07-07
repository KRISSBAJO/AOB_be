import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { PublicBookingsController } from "./public-bookings.controller";
import { PublicBookingsService } from "./public-bookings.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicBookingsController],
  providers: [PublicBookingsService],
})
export class PublicBookingsModule {}
