import { IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateShiftDto {
  @IsUUID()
  userId!: string;

  @Matches(DATE_RE, { message: "date должен быть в формате YYYY-MM-DD" })
  date!: string;

  @Matches(TIME_RE, { message: "startTime должен быть в формате HH:MM" })
  startTime!: string;

  @Matches(TIME_RE, { message: "endTime должен быть в формате HH:MM" })
  endTime!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class UpdateShiftDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: "date должен быть в формате YYYY-MM-DD" })
  date?: string;

  @IsOptional()
  @Matches(TIME_RE, { message: "startTime должен быть в формате HH:MM" })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_RE, { message: "endTime должен быть в формате HH:MM" })
  endTime?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string | null;
}

export class ShiftRangeDto {
  @Matches(DATE_RE, { message: "start должен быть в формате YYYY-MM-DD" })
  start!: string;

  @Matches(DATE_RE, { message: "end должен быть в формате YYYY-MM-DD" })
  end!: string;
}
