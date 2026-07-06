import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateWorkspaceDto {
  @ApiProperty({ example: "AOG Services" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "support@aogservices.com" })
  @IsOptional()
  @IsString()
  supportEmail?: string;
}

