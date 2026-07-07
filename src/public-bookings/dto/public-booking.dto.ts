import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ServiceLine } from "@prisma/client";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreatePublicServiceBookingDto {
  @ApiProperty({ example: "Jordan" })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: "Rivera" })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: "jordan@company.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "+1 555 026 4700" })
  @IsString()
  @MinLength(7)
  phone!: string;

  @ApiPropertyOptional({ example: "Meridian Group" })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ enum: ServiceLine })
  @IsEnum(ServiceLine)
  serviceLine!: ServiceLine;

  @ApiPropertyOptional({ example: "Night security coverage" })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ example: "Meridian Tower" })
  @IsOptional()
  @IsString()
  facilityName?: string;

  @ApiPropertyOptional({ example: "1200 Facilities Way" })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: "Suite 400" })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: "Austin" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "TX" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: "78701" })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: "US" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestedStartAt?: string;

  @ApiPropertyOptional({ example: "Morning, 8 AM - 12 PM" })
  @IsOptional()
  @IsString()
  preferredTimeWindow?: string;

  @ApiProperty({ example: "We need daily cleaning coverage for two floors." })
  @IsString()
  @MinLength(5)
  message!: string;
}

export class LookupPublicServiceBookingDto {
  @ApiProperty({ example: "AOG-202607-0001" })
  @IsString()
  @MinLength(6)
  orderNumber!: string;

  @ApiProperty({ example: "Rivera" })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: "jordan@company.com" })
  @IsString()
  @MinLength(3)
  emailOrPhone!: string;
}
