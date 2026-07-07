import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { QaController } from "./qa.controller";
import { QaService } from "./qa.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [QaController],
  providers: [QaService],
})
export class QaModule {}
