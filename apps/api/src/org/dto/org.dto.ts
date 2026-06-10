import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class CreateStaffPositionDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  plannedCount?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class UpdateStaffPositionDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  plannedCount?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
