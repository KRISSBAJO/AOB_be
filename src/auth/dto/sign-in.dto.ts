import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class SignInDto {
  @ApiProperty({ example: "ops@aogservices.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "SecurePassword123" })
  @IsString()
  @MinLength(1)
  password!: string;
}

