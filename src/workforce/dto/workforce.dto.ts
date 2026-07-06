import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  DepartmentType,
  EmployeeStatus,
  EmploymentType,
  ServiceLine,
} from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: DepartmentType })
  @IsOptional()
  @IsEnum(DepartmentType)
  type?: DepartmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class CreatePositionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) {}

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ServiceLine })
  @IsOptional()
  @IsEnum(ServiceLine)
  serviceLine?: ServiceLine;
}

export class UpdateSkillDto extends PartialType(CreateSkillDto) {}

export class CreateCertificationDto extends CreateSkillDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  expires?: boolean;
}

export class UpdateCertificationDto extends PartialType(CreateCertificationDto) {}

export class CreateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ enum: ServiceLine, isArray: true })
  @IsOptional()
  @IsEnum(ServiceLine, { each: true })
  serviceLines?: ServiceLine[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class AssignEmployeeSkillDto {
  @ApiProperty()
  @IsString()
  skillId!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  level?: number;
}

export class AssignEmployeeCertificationDto {
  @ApiProperty()
  @IsString()
  certificationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
