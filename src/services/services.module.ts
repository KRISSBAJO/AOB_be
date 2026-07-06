import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
