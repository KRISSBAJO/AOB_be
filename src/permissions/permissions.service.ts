import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_PERMISSIONS } from "./permissions.catalog";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { code: "asc" }],
    });
  }

  async seedDefaults() {
    return Promise.all(
      DEFAULT_PERMISSIONS.map((permission) =>
        this.prisma.permission.upsert({
          where: { code: permission.code },
          create: permission,
          update: {
            name: permission.name,
            group: permission.group,
          },
        }),
      ),
    );
  }
}
