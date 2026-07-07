import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
