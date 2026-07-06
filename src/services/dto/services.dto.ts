import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { ServiceLine, ServiceUnit } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateServiceCategoryDto {
  @ApiProperty({ example: "Commercial Cleaning" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ServiceLine, example: ServiceLine.CLEANING })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateServiceCategoryDto extends PartialType(CreateServiceCategoryDto) {}

export class CreateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: "JAN-NIGHTLY" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: "Nightly Janitorial Service" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ServiceLine, example: ServiceLine.CLEANING })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiPropertyOptional({ enum: ServiceUnit, default: ServiceUnit.VISIT })
  @IsOptional()
  @IsEnum(ServiceUnit)
  defaultUnit?: ServiceUnit;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresInspection?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isBookableOnline?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class CreateServicePriceDto {
  @ApiProperty({ example: "Standard visit" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: ServiceUnit, default: ServiceUnit.VISIT })
  @IsOptional()
  @IsEnum(ServiceUnit)
  unit?: ServiceUnit;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "USD", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxQuantity?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServicePriceDto extends PartialType(CreateServicePriceDto) {}

export class CreateServiceRequirementDto {
  @ApiProperty({ example: "After-hours access approval" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class UpdateServiceRequirementDto extends PartialType(CreateServiceRequirementDto) {}

export class CreateServiceAreaDto {
  @ApiProperty({ example: "Dallas Metro" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "Dallas" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "TX" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: "75201" })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: "US" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceAreaDto extends PartialType(CreateServiceAreaDto) {}
