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

export const TRIP_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const EXPENSE_CATEGORIES = ["TRAVEL", "LODGING", "MEALS", "TRANSPORT", "OTHER"] as const;

export class CreateBusinessTripDto {
  @IsString()
  @Length(2, 200)
  destination!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  purpose?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateBusinessTripDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  destination?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  purpose?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateExpenseDto {
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsIn(EXPENSE_CATEGORIES)
  category!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000_000)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsDateString()
  spentAt!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  receiptUrl?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000_000)
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  receiptUrl?: string;
}

export class DecisionDto {
  @IsIn(["APPROVED", "REJECTED"])
  decision!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  comment?: string;
}
