import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

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

export class SendMessageDto {
  @IsString()
  @Length(1, 4000)
  body!: string;
}
