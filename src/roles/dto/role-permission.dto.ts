import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RolePermissionDto {
  @ApiProperty({ example: "customers.manage" })
  @IsString()
  permissionCode!: string;
}

