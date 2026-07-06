import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  token!: string;

  @ApiProperty({ example: "NewSecurePassword123" })
  @IsString()
  @MinLength(8)
  password!: string;
}

