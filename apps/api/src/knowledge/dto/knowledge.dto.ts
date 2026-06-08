import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";

export const COURSE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

/* ───────── База знаний ───────── */

export class CreateArticleDto {
  @IsString()
  @Length(2, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 50000)
  content?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  category?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50000)
  content?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  category?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

/* ───────── LMS ───────── */

export class CourseLessonDto {
  @IsString()
  @Length(1, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 50000)
  content?: string;
}

export class CreateCourseDto {
  @IsString()
  @Length(2, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CourseLessonDto)
  lessons!: CourseLessonDto[];
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CourseLessonDto)
  lessons?: CourseLessonDto[];
}
