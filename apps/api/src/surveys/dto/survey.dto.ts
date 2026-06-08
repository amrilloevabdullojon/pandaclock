import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export const SURVEY_TYPES = ["ENPS", "PULSE", "CUSTOM"] as const;
export const SURVEY_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export const QUESTION_KINDS = ["SCALE_0_10", "SCALE_1_5", "TEXT", "CHOICE"] as const;

export class SurveyQuestionDto {
  @IsString()
  @Length(1, 500)
  text!: string;

  @IsIn(QUESTION_KINDS)
  kind!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateSurveyDto {
  @IsString()
  @Length(2, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsIn(SURVEY_TYPES)
  type?: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions!: SurveyQuestionDto[];
}

export class UpdateSurveyDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsIn(SURVEY_STATUSES)
  status?: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  /** Замена всех вопросов — допустима только пока опрос в статусе DRAFT. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions?: SurveyQuestionDto[];
}

export class SurveyAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  valueInt?: number;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  valueText?: string;
}

export class SubmitResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SurveyAnswerDto)
  answers!: SurveyAnswerDto[];
}
