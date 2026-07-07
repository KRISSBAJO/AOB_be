import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { PayrollController } from "./payroll.controller";
import { StaffPortalController } from "./staff-portal.controller";
import { StaffPortalService } from "./staff-portal.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [StaffPortalController, PayrollController],
  providers: [StaffPortalService],
})
export class StaffPortalModule {}
