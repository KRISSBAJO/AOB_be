import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  AttendanceStatus,
  LeaveStatus,
  LeaveType,
  ServiceLine,
  ShiftStatus,
  WorkOrderAssignmentRole,
} from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiProperty({ enum: ServiceLine })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  requiredStaffCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

export class UpdateShiftStatusDto {
  @ApiProperty({ enum: ShiftStatus })
  @IsEnum(ShiftStatus)
  status!: ShiftStatus;
}

export class CreateShiftAssignmentDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional({ enum: WorkOrderAssignmentRole })
  @IsOptional()
  @IsEnum(WorkOrderAssignmentRole)
  role?: WorkOrderAssignmentRole;

  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAttendanceDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  clockInAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  clockOutAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clockInLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clockInLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clockOutLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  clockOutLongitude?: number;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {}

export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty({ enum: LeaveType })
  @IsEnum(LeaveType)
  type!: LeaveType;

  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class ReviewLeaveRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
