import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateChannelDto {
  @IsIn(["CHANNEL", "DM"])
  type!: "CHANNEL" | "DM";

  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  memberIds!: string[];
}

export class ChatAttachmentDto {
  @IsString()
  @Length(1, 2000)
  url!: string;

  @IsString()
  @Length(1, 500)
  filename!: string;

  @IsInt()
  @Min(0)
  size!: number;

  @IsString()
  @Length(1, 200)
  mimeType!: string;
}

export class SendMessageDto {
  /** Допускаем пустой body если есть attachments — сервис проверит. */
  @IsString()
  @Length(0, 4000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}
