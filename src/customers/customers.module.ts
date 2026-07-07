import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthModule } from "../auth/auth.module";
import { WorkspaceAccessModule } from "../common/access/workspace-access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, AuthModule, WorkspaceAccessModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
