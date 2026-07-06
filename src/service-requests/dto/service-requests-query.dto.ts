import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServiceLine, ServiceRequestPriority, ServiceRequestStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListServiceRequestsQueryDto extends PaginationQueryDto {
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
  assignedManagerId?: string;

  @ApiPropertyOptional({ enum: ServiceLine })
  @IsOptional()
  @IsEnum(ServiceLine)
  serviceLine?: ServiceLine;

  @ApiPropertyOptional({ enum: ServiceRequestStatus })
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @ApiPropertyOptional({ enum: ServiceRequestPriority })
  @IsOptional()
  @IsEnum(ServiceRequestPriority)
  priority?: ServiceRequestPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTo?: string;
}
