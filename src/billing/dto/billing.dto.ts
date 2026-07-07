import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { InvoiceStatus, PaymentMethodType, PaymentStatus, ServiceUnit } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class SendInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateInvoiceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ enum: ServiceUnit })
  @IsOptional()
  @IsEnum(ServiceUnit)
  unit?: ServiceUnit;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 8.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class UpdateInvoiceItemDto extends PartialType(CreateInvoiceItemDto) {}

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentNumber?: string;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  method?: PaymentMethodType;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
