import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceAccessModule } from "../common/access/workspace-access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkforceController } from "./workforce.controller";
import { WorkforceService } from "./workforce.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, AuthModule, WorkspaceAccessModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
})
export class WorkforceModule {}
