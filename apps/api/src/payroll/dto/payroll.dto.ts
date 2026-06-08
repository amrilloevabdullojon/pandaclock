import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

export const RUN_STATUSES = ["DRAFT", "APPROVED", "PAID"] as const;

export class SetSalaryDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000_000)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class CreateRunDto {
  @IsString()
  @Length(2, 32)
  period!: string;
}

export class UpdateRunStatusDto {
  @IsIn(["APPROVED", "PAID"])
  status!: string;
}

export class UpdatePayslipDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000_000)
  bonus?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000_000)
  deductions?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}
