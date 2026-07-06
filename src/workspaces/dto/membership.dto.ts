import { ApiProperty } from "@nestjs/swagger";
import { WorkspaceRole } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class CreateMembershipDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class UpdateMembershipDto {
  @ApiProperty({ enum: WorkspaceRole })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

