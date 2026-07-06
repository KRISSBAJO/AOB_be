import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}

