import { ApiPropertyOptional } from "@nestjs/swagger";
import { DepartmentType, EmployeeStatus, EmploymentType, ServiceLine } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

function optionalBoolean(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

export class ListDepartmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DepartmentType })
  @IsOptional()
  @IsEnum(DepartmentType)
  type?: DepartmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class ListEmployeesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: ServiceLine })
  @IsOptional()
  @IsEnum(ServiceLine)
  serviceLine?: ServiceLine;
}
