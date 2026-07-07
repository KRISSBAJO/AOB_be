import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ComplaintStatus,
  CorrectiveActionStatus,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  ServiceRequestPriority,
} from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListComplaintsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({ enum: ServiceRequestPriority })
  @IsOptional()
  @IsEnum(ServiceRequestPriority)
  priority?: ServiceRequestPriority;
}

export class ListCorrectiveActionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CorrectiveActionStatus })
  @IsOptional()
  @IsEnum(CorrectiveActionStatus)
  status?: CorrectiveActionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class ListIncidentsQueryDto extends PaginationQueryDto {
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
}
