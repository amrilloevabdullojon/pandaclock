import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class CreateAnnouncementDto {
  @IsString()
  @Length(2, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 20000)
  body?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20000)
  body?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
