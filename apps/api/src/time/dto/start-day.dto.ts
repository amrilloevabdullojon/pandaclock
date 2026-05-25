import { IsLatitude, IsLongitude, IsOptional, IsString } from "class-validator";

export class StartDayDto {
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  /** Если сотрудник вне geofence, фронт может попросить подтверждение и передать причину. */
  @IsOptional()
  @IsString()
  note?: string;
}

export class FinishDayDto {
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

export class BreakDto {
  @IsOptional()
  @IsString()
  type?: "LUNCH" | "PERSONAL" | "TECHNICAL";
}
