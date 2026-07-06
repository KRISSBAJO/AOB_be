import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ServiceLine,
  ServiceRequestPriority,
  ServiceRequestStatus,
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
  Min,
  MinLength,
} from "class-validator";

export class CreateServiceRequestDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestedByContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedManagerId?: string;

  @ApiProperty({ example: "Emergency porter service" })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ServiceLine })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiPropertyOptional({ enum: ServiceRequestPriority })
  @IsOptional()
  @IsEnum(ServiceRequestPriority)
  priority?: ServiceRequestPriority;

  @ApiPropertyOptional({ enum: ServiceRequestStatus })
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestedStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestedEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredTimeWindow?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedAmount?: number;
}

export class UpdateServiceRequestDto extends PartialType(CreateServiceRequestDto) {}

export class UpdateServiceRequestStatusDto {
  @ApiProperty({ enum: ServiceRequestStatus })
  @IsEnum(ServiceRequestStatus)
  status!: ServiceRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateServiceRequestItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional({ example: "Nightly janitorial service" })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ enum: ServiceUnit })
  @IsOptional()
  @IsEnum(ServiceUnit)
  unit?: ServiceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class ConvertServiceRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  qaRequired?: boolean;
}
