import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({ required: false, description: "Optional when the refresh cookie is present." })
  @IsOptional()
  @IsString()
  @MinLength(20)
  refreshToken?: string;
}
