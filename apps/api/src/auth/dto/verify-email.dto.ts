import { IsEmail, IsString, MinLength } from "class-validator";

export class VerifyEmailDto {
  @IsString()
  @MinLength(20)
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}
