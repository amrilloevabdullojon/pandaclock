import { IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateDepartmentDto {
  @IsString()
  @Length(2, 255)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  headId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  headId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
