import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkforceController } from "./workforce.controller";
import { WorkforceService } from "./workforce.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, AuthModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
})
export class WorkforceModule {}
