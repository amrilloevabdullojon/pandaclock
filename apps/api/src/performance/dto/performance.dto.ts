import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateGoalDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Length(2, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: "dueDate должен быть в формате YYYY-MM-DD" })
  dueDate?: string;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsIn(["ACTIVE", "DONE", "CANCELLED"])
  status?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: "dueDate должен быть в формате YYYY-MM-DD" })
  dueDate?: string | null;
}

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;
}

export class CreateCheckinDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  comment?: string;
}

export class CreateReviewDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Length(2, 64)
  periodLabel!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  comment?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  @Length(2, 64)
  periodLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  comment?: string | null;
}
