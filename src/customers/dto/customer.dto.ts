import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { ContactRole, CustomerStatus, CustomerType } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateCustomerDto {
  @ApiPropertyOptional({ example: "ACME-001" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: "Acme Facilities Group" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.COMPANY })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ example: "Commercial real estate" })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: "12-3456789" })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: "billing@acme.com" })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional({ example: "+1 555 0100" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "https://acme.com" })
  @IsOptional()
  @IsString()
  website?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CreateCustomerContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: "Jordan" })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: "Rivera" })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional({ example: "jordan@acme.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+1 555 0101" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "Facilities Director" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ContactRole })
  @IsOptional()
  @IsEnum(ContactRole)
  role?: ContactRole;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canLogin?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerContactDto extends PartialType(CreateCustomerContactDto) {}
