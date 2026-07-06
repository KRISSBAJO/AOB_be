import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ example: "Operations Manager" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ["customers.manage", "operations.manage"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

