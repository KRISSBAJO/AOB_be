import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ComplaintStatus,
  CorrectiveActionStatus,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  ServiceRequestPriority,
} from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateComplaintDto {
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
  serviceRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({ enum: ServiceRequestPriority })
  @IsOptional()
  @IsEnum(ServiceRequestPriority)
  priority?: ServiceRequestPriority;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateComplaintDto extends PartialType(CreateComplaintDto) {}

export class UpdateComplaintStatusDto {
  @ApiProperty({ enum: ComplaintStatus })
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class CreateCorrectiveActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complaintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: CorrectiveActionStatus })
  @IsOptional()
  @IsEnum(CorrectiveActionStatus)
  status?: CorrectiveActionStatus;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateCorrectiveActionDto extends PartialType(CreateCorrectiveActionDto) {}

export class CreateIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: IncidentType })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}
