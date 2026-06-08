import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export const VACANCY_STATUSES = ["OPEN", "CLOSED"] as const;
export const CANDIDATE_STAGES = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;

export class CreateVacancyDto {
  @IsString()
  @Length(2, 300)
  title!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  description?: string;
}

export class UpdateVacancyDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  description?: string;

  @IsOptional()
  @IsIn(VACANCY_STATUSES)
  status?: string;
}

export class CreateCandidateDto {
  @IsString()
  @Length(2, 200)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  source?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  source?: string;

  @IsOptional()
  @IsIn(CANDIDATE_STAGES)
  stage?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class UpdateCandidateStageDto {
  @IsIn(CANDIDATE_STAGES)
  stage!: string;
}
