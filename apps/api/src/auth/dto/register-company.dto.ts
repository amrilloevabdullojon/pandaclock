import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";

export class RegisterCompanyDto {
  @IsString()
  @Length(2, 255)
  companyName!: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9-]{2,30}$/, {
    message: "slug must be 3-31 lowercase letters/digits/dashes",
  })
  slug!: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsString()
  @Length(1, 100)
  adminFirstName!: string;

  @IsString()
  @Length(1, 100)
  adminLastName!: string;

  @IsOptional()
  @IsString()
  adminMiddleName?: string;

  @IsEmail()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}
