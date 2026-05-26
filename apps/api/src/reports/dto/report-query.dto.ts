import { IsDateString, IsIn, IsOptional } from "class-validator";

export const REPORT_FORMATS = ["xlsx", "pdf", "json"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}

export class ExportQueryDto extends ReportQueryDto {
  @IsIn(REPORT_FORMATS)
  format!: ReportFormat;
}
