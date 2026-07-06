import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class SignUpDto {
  @ApiProperty({ example: "ops@aogservices.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Jordan Rivera" })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ example: "AOG Services" })
  @IsString()
  @MinLength(2)
  workspaceName!: string;

  @ApiProperty({ example: "SecurePassword123" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "+1 555 0100" })
  @IsOptional()
  @IsString()
  phone?: string;
}

