import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

export class CreateOnboardingItemDto {
  @IsUUID()
  userId!: string;

  @IsIn(["ONBOARDING", "OFFBOARDING"])
  kind!: string;

  @IsString()
  @Length(1, 300)
  title!: string;
}

export class SeedChecklistDto {
  @IsUUID()
  userId!: string;

  @IsIn(["ONBOARDING", "OFFBOARDING"])
  kind!: string;
}

export class UpdateOnboardingItemDto {
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  title?: string;
}

export class CreateHrDocumentDto {
  @IsString()
  @Length(2, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  body?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  /** Кому адресован документ. Пусто = всем активным сотрудникам. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  recipientIds?: string[];
}
