import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { IssuesController } from "./issues.controller";
import { IssuesService } from "./issues.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
