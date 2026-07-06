import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsService } from "./permissions.service";

@ApiTags("permissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  list() {
    return this.permissionsService.list();
  }
}

