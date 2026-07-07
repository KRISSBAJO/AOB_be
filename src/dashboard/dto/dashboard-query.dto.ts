import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class DashboardRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class DashboardWorkOrdersQueryDto extends DashboardRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceLine?: string;
}
