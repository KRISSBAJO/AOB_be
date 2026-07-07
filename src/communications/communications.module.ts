import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { WorkspaceAccessModule } from "../common/access/workspace-access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CommunicationsController } from "./communications.controller";
import { CommunicationsService } from "./communications.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, WorkspaceAccessModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
