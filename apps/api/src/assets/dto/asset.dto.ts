import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
} from "class-validator";

export const ASSET_CATEGORIES = [
  "LAPTOP",
  "PHONE",
  "MONITOR",
  "PERIPHERAL",
  "FURNITURE",
  "VEHICLE",
  "OTHER",
] as const;
export const ASSET_STATUSES = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"] as const;
/** Статусы, которые можно выставить вручную (ASSIGNED — только через assign). */
export const ASSET_MANUAL_STATUSES = ["AVAILABLE", "MAINTENANCE", "RETIRED"] as const;

export class CreateAssetDto {
  @IsString()
  @Length(2, 200)
  name!: string;

  @IsIn(ASSET_CATEGORIES)
  category!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000_000)
  cost?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @IsIn(ASSET_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  serialNumber?: string;

  @IsOptional()
  @IsIn(ASSET_MANUAL_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000_000)
  cost?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class AssignAssetDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}

export class ReturnAssetDto {
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}
