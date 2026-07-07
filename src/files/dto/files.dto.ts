import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { AttachmentEntityType, DocumentType } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateAttachmentDto {
  @ApiProperty({ enum: AttachmentEntityType })
  @IsEnum(AttachmentEntityType)
  entityType!: AttachmentEntityType;

  @ApiProperty()
  @IsString()
  entityId!: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCommentDto {
  @ApiProperty({ enum: AttachmentEntityType })
  @IsEnum(AttachmentEntityType)
  entityType!: AttachmentEntityType;

  @ApiProperty()
  @IsString()
  entityId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  internalOnly?: boolean;
}

export class UpdateCommentDto extends PartialType(CreateCommentDto) {}
