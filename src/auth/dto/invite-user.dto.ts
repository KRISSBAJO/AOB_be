import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class InviteUserDto {
  @ApiPropertyOptional({
    description: "Optional absolute invite URL base. Defaults to PUBLIC_APP_URL.",
  })
  @IsOptional()
  @IsString()
  redirectBaseUrl?: string;
}
