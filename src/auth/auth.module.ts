import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PermissionsModule } from "../permissions/permissions.module";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [JwtModule.register({}), PermissionsModule],
  controllers: [AuthController],
  providers: [AuthService, AuthCookieService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
