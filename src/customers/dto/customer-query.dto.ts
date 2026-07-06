import { ApiPropertyOptional } from "@nestjs/swagger";
import { CustomerStatus, CustomerType, FacilityStatus, FacilityType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
}

export class ListFacilitiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: FacilityStatus })
  @IsOptional()
  @IsEnum(FacilityStatus)
  status?: FacilityStatus;

  @ApiPropertyOptional({ enum: FacilityType })
  @IsOptional()
  @IsEnum(FacilityType)
  type?: FacilityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
}
