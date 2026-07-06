import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Avery Morgan" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @ApiPropertyOptional({ example: "+1 555 0123" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSiteAdmin?: boolean;
}

