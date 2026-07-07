import { ApiPropertyOptional } from "@nestjs/swagger";
import { BackgroundJobStatus, BackgroundJobType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;
}

export class ListSystemSettingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class ListBackgroundJobsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BackgroundJobType })
  @IsOptional()
  @IsEnum(BackgroundJobType)
  type?: BackgroundJobType;

  @ApiPropertyOptional({ enum: BackgroundJobStatus })
  @IsOptional()
  @IsEnum(BackgroundJobStatus)
  status?: BackgroundJobStatus;
}
