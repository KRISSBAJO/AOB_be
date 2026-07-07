import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { InspectionItemResultValue, InspectionStatus, ServiceLine } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateInspectionTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ServiceLine })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateInspectionTemplateDto extends PartialType(CreateInspectionTemplateDto) {}

export class CreateInspectionTemplateItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  question!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

export class CreateInspectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectorEmployeeId?: string;

  @ApiPropertyOptional({ enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInspectionDto extends PartialType(CreateInspectionDto) {}

export class CreateInspectionResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ enum: InspectionItemResultValue })
  @IsOptional()
  @IsEnum(InspectionItemResultValue)
  result?: InspectionItemResultValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CompleteInspectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
