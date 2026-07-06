import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ServiceLine,
  ServiceRequestPriority,
  WorkOrderAssignmentRole,
  WorkOrderPhotoType,
  WorkOrderStatus,
  WorkOrderTaskStatus,
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

export class CreateWorkOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

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
  supervisorEmployeeId?: string;

  @ApiProperty()
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

  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {}

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  qaPassed?: boolean;
}

export class CreateWorkOrderTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: WorkOrderTaskStatus })
  @IsOptional()
  @IsEnum(WorkOrderTaskStatus)
  status?: WorkOrderTaskStatus;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateWorkOrderTaskDto extends PartialType(CreateWorkOrderTaskDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completedByEmployeeId?: string;
}

export class CreateWorkOrderAssignmentDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ enum: WorkOrderAssignmentRole })
  @IsOptional()
  @IsEnum(WorkOrderAssignmentRole)
  role?: WorkOrderAssignmentRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWorkOrderPhotoDto {
  @ApiProperty()
  @IsString()
  url!: string;

  @ApiPropertyOptional({ enum: WorkOrderPhotoType })
  @IsOptional()
  @IsEnum(WorkOrderPhotoType)
  type?: WorkOrderPhotoType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadedByEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWorkOrderSignoffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signedByContactId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  signedByName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
