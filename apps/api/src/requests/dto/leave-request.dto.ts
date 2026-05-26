import { IsDateString, IsIn, IsOptional, IsString, Length } from "class-validator";

export const LEAVE_TYPES = ["VACATION", "SICK", "TIME_OFF", "OTHER"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export class CreateLeaveRequestDto {
  @IsIn(LEAVE_TYPES)
  type!: LeaveType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  reason?: string;
}

export class DecideLeaveRequestDto {
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  comment?: string;
}
