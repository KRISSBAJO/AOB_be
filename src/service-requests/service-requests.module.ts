import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { WorkspaceAccessModule } from "../common/access/workspace-access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ServiceRequestsController } from "./service-requests.controller";
import { ServiceRequestsService } from "./service-requests.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, WorkspaceAccessModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
