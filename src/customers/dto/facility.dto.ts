import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { ContactRole, FacilityStatus, FacilityType } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateFacilityDto {
  @ApiProperty({ example: "customer_cuid" })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ example: "HQ-001" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: "Acme Dallas HQ" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: FacilityType, default: FacilityType.OFFICE })
  @IsOptional()
  @IsEnum(FacilityType)
  type?: FacilityType;

  @ApiPropertyOptional({ enum: FacilityStatus, default: FacilityStatus.ACTIVE })
  @IsOptional()
  @IsEnum(FacilityStatus)
  status?: FacilityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: "Dallas" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "TX" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: "75201" })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: "US" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 32.7767 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -96.797 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {}

export class CreateFacilityContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerContactId?: string;

  @ApiProperty({ example: "Security Desk" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "security@acme.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+1 555 0102" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ContactRole })
  @IsOptional()
  @IsEnum(ContactRole)
  role?: ContactRole;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateFacilityContactDto extends PartialType(CreateFacilityContactDto) {}
