import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { CommunicationsController } from "./communications.controller";
import { CommunicationsService } from "./communications.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
