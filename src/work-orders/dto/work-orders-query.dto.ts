import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServiceLine, ServiceRequestPriority, WorkOrderStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListWorkOrdersQueryDto extends PaginationQueryDto {
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
  supervisorEmployeeId?: string;

  @ApiPropertyOptional({ enum: ServiceLine })
  @IsOptional()
  @IsEnum(ServiceLine)
  serviceLine?: ServiceLine;

  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: ServiceRequestPriority })
  @IsOptional()
  @IsEnum(ServiceRequestPriority)
  priority?: ServiceRequestPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTo?: string;
}
