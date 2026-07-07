import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
