import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ListResourcesQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @ApiPropertyOptional({ example: "createdAt:desc" })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({ example: "ck..." })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ example: "ck..." })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: "ck..." })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ example: "ACTIVE" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "CLEANING" })
  @IsOptional()
  @IsString()
  serviceLine?: string;

  @ApiPropertyOptional({ example: "NORMAL" })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: "smith" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "JSON Prisma where clause merged with the simple filters.",
    example: "{\"isActive\":true}",
  })
  @IsOptional()
  @IsString()
  where?: string;

  @ApiPropertyOptional({
    description: "JSON Prisma include clause.",
    example: "{\"customer\":true}",
  })
  @IsOptional()
  @IsString()
  include?: string;

  @ApiPropertyOptional({
    description: "JSON Prisma select clause. Do not combine with include.",
    example: "{\"id\":true,\"name\":true}",
  })
  @IsOptional()
  @IsString()
  select?: string;
}

