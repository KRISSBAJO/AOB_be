import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BackgroundJobType } from "@prisma/client";
import { Type } from "class-transformer";
import { Allow, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertSystemSettingDto {
  @ApiProperty()
  @Allow()
  value!: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBackgroundJobDto {
  @ApiProperty({ enum: BackgroundJobType })
  @IsEnum(BackgroundJobType)
  type!: BackgroundJobType;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  payload?: unknown;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxAttempts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  runAt?: string;
}
