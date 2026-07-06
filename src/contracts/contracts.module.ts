import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
