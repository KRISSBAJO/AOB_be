import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  AttachmentEntityType,
  ConversationParticipantType,
  ConversationType,
  MessageVisibility,
  NotificationChannel,
  NotificationType,
} from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateConversationDto {
  @ApiPropertyOptional({ enum: ConversationType })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class UpdateConversationDto extends PartialType(CreateConversationDto) {}

export class CreateConversationParticipantDto {
  @ApiProperty({ enum: ConversationParticipantType })
  @IsEnum(ConversationParticipantType)
  type!: ConversationParticipantType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerContactId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  displayName!: string;
}

export class CreateConversationMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderCustomerContactId?: string;

  @ApiPropertyOptional({ enum: MessageVisibility })
  @IsOptional()
  @IsEnum(MessageVisibility)
  visibility?: MessageVisibility;
}

export class CreateMessageAttachmentDto {
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
}

export class CreateNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerContactId?: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ enum: AttachmentEntityType })
  @IsOptional()
  @IsEnum(AttachmentEntityType)
  entityType?: AttachmentEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}
