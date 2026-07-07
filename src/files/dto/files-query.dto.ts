import { ApiPropertyOptional } from "@nestjs/swagger";
import { AttachmentEntityType, DocumentType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListAttachmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AttachmentEntityType })
  @IsOptional()
  @IsEnum(AttachmentEntityType)
  entityType?: AttachmentEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}

export class ListCommentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AttachmentEntityType })
  @IsOptional()
  @IsEnum(AttachmentEntityType)
  entityType?: AttachmentEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}
