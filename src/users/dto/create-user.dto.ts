import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "manager@aogservices.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Avery Morgan" })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ example: "SecurePassword123" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "+1 555 0123" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSiteAdmin?: boolean;
}

