import { IsIn, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export const USER_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "TERMINATED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SORT_FIELDS = ["name", "role", "status", "department", "hireDate"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_DIRS = ["asc", "desc"] as const;
export type SortDir = (typeof SORT_DIRS)[number];

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
  @IsIn(SORT_FIELDS)
  sortBy?: SortField;

  @IsOptional()
  @IsIn(SORT_DIRS)
  sortDir?: SortDir;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 20;
}
