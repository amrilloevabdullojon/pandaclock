import { IsIn, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export const USER_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "TERMINATED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export class EmployeesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 20;
}
