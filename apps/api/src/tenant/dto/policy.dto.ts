import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class GeofenceDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  /** В метрах. Минимум 10 (датчик не точнее), максимум 50 км (целый кампус). */
  @IsInt()
  @Min(10)
  @Max(50_000)
  radius!: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}

/**
 * Частичное обновление tenant.time_policy.
 *
 * Поле `geofence` имеет три значения:
 *  - undefined → не трогать существующее значение
 *  - null      → удалить geofence (вернуть сотрудникам возможность отмечаться откуда угодно)
 *  - объект    → установить новое
 *
 * class-transformer-у null нужно явно подсказать ValidateIf-ом — иначе он бросит
 * «nested object expected». Проверка через if (value !== null).
 */
export class LeavePolicyDto {
  @IsInt()
  @Min(0)
  @Max(60)
  vacationDaysPerYear!: number;

  @IsInt()
  @Min(0)
  @Max(30)
  sickDaysPerYearWithoutDoc!: number;

  @IsInt()
  @Min(0)
  @Max(60)
  unpaidDaysPerYear!: number;
}

export class UpdateTimePolicyDto {
  /** HH:mm */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "workStart должен быть HH:mm" })
  workStart?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "workEnd должен быть HH:mm" })
  workEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lateThresholdMinutes?: number;

  /** ISO weekdays: 1=Mon..7=Sun. Минимум 1 рабочий день, максимум 7. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workdays?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GeofenceDto)
  geofence?: GeofenceDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeavePolicyDto)
  leave?: LeavePolicyDto;
}

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  industry?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 64)
  timezone?: string;
}
