import { IsOptional, IsString, IsUUID, Length, ValidateIf } from "class-validator";

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

  // null допустим — означает «вынести в корень».
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsUUID()
  headId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
