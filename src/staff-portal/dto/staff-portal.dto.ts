import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

export class ClockInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockOutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attendanceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proofNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  proofPhotoUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completeWorkOrder?: boolean;
}

export class PayrollSummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
