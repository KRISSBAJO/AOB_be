import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ConversationType,
  MessageVisibility,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListConversationsQueryDto extends PaginationQueryDto {
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
}

export class ListMessagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MessageVisibility })
  @IsOptional()
  @IsEnum(MessageVisibility)
  visibility?: MessageVisibility;
}

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}
