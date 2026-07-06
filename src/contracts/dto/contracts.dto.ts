import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  BillingFrequency,
  ContractStatus,
  RecurrenceFrequency,
  ServiceLine,
  ServiceUnit,
} from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateContractDto {
  @ApiProperty({ example: "customer_cuid" })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ example: "AOG-202607-0001" })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiProperty({ example: "Acme Dallas Integrated Facility Services" })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional({ enum: ContractStatus, default: ContractStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiProperty({ example: "2026-07-01" })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: "2027-06-30" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: BillingFrequency, default: BillingFrequency.MONTHLY })
  @IsOptional()
  @IsEnum(BillingFrequency)
  billingFrequency?: BillingFrequency;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @ApiPropertyOptional({ example: "USD", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  renewalNoticeDays?: number;

  @ApiPropertyOptional({ example: "2026-06-15" })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContractDto extends PartialType(CreateContractDto) {}

export class UpdateContractStatusDto {
  @ApiProperty({ enum: ContractStatus })
  @IsEnum(ContractStatus)
  status!: ContractStatus;
}

export class AddContractFacilityDto {
  @ApiProperty({ example: "facility_cuid" })
  @IsString()
  facilityId!: string;
}

export class CreateContractServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional({ enum: ServiceLine })
  @IsOptional()
  @IsEnum(ServiceLine)
  serviceLine?: ServiceLine;

  @ApiPropertyOptional({ example: "Nightly janitorial service" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RecurrenceFrequency, default: RecurrenceFrequency.WEEKLY })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({ example: 5, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ enum: ServiceUnit, default: ServiceUnit.VISIT })
  @IsOptional()
  @IsEnum(ServiceUnit)
  unit?: ServiceUnit;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateContractServiceDto extends PartialType(CreateContractServiceDto) {}

export class CreateContractScheduleDto {
  @ApiProperty({ enum: ServiceLine, example: ServiceLine.CLEANING })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiPropertyOptional({ enum: RecurrenceFrequency, default: RecurrenceFrequency.WEEKLY })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({ minimum: 0, maximum: 6, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 31, example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ example: "18:00" })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: "23:00" })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: "America/Chicago" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContractScheduleDto extends PartialType(CreateContractScheduleDto) {}
