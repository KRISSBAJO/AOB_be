import { ApiPropertyOptional } from "@nestjs/swagger";
import { InspectionStatus, ServiceLine } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

function optionalBoolean(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

export class ListInspectionTemplatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ServiceLine })
  @IsOptional()
  @IsEnum(ServiceLine)
  serviceLine?: ServiceLine;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class ListInspectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;
}
