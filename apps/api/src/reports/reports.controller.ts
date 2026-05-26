import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ReportsService } from "./reports.service.js";
import { ExportService } from "./export.service.js";
import { ExportQueryDto, ReportQueryDto } from "./dto/report-query.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "HR", "MANAGER")
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exporter: ExportService,
  ) {}

  @Get("attendance")
  @ApiOperation({ summary: "Сводка посещаемости" })
  async attendance(@Query() query: ReportQueryDto, @CurrentUser() user: AuthRequestUser) {
    const period = await this.reports.period(user.tenantSlug, query);
    const rows = await this.reports.attendance(period);
    return { period, rows };
  }

  @Get("hours")
  async hours(@Query() query: ReportQueryDto, @CurrentUser() user: AuthRequestUser) {
    const period = await this.reports.period(user.tenantSlug, query);
    const rows = await this.reports.hours(period);
    return { period, rows };
  }

  @Get("tasks")
  async tasks(@Query() query: ReportQueryDto, @CurrentUser() user: AuthRequestUser) {
    const period = await this.reports.period(user.tenantSlug, query);
    const rows = await this.reports.tasks(period);
    return { period, rows };
  }

  @Get(":type/export")
  async export(
    @Param("type") type: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: AuthRequestUser,
    @Res() res: Response,
  ): Promise<void> {
    const period = await this.reports.period(user.tenantSlug, query);
    const { title, headers, rows } = await this.assemble(type, period);

    if (query.format === "json") {
      res.json({ title, period, headers, rows });
      return;
    }

    const buffer =
      query.format === "xlsx"
        ? this.exporter.toExcel(title, headers, rows)
        : await this.exporter.toPdf(title, headers, rows);
    const filename = `${type}-${period.startIso}_${period.endIso}.${query.format}`;
    res.setHeader(
      "Content-Type",
      query.format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  private async assemble(
    type: string,
    period: { startIso: string; endIso: string },
  ): Promise<{ title: string; headers: string[]; rows: (string | number)[][] }> {
    if (type === "attendance") {
      const rows = await this.reports.attendance(period);
      return {
        title: "Посещаемость",
        headers: ["ФИО", "Email", "Отдел", "Дни", "Опозданий", "Часов"],
        rows: rows.map((row) => [
          row.fullName,
          row.email,
          row.departmentName ?? "—",
          row.daysWorked,
          row.lateCount,
          Math.round((row.totalMinutes / 60) * 10) / 10,
        ]),
      };
    }
    if (type === "hours") {
      const rows = await this.reports.hours(period);
      return {
        title: "Отработанные часы",
        headers: ["ФИО", "Дней", "Всего часов", "Средние часы/день"],
        rows: rows.map((row) => [
          row.fullName,
          row.daysCount,
          Math.round((row.totalMinutes / 60) * 10) / 10,
          Math.round((row.averageMinutes / 60) * 10) / 10,
        ]),
      };
    }
    if (type === "tasks") {
      const rows = await this.reports.tasks(period);
      return {
        title: "Задачи",
        headers: ["ФИО", "Назначено", "Выполнено", "% выполнения", "Просрочено"],
        rows: rows.map((row) => [
          row.fullName,
          row.assigned,
          row.completed,
          `${String(row.completionRate)}%`,
          row.overdue,
        ]),
      };
    }
    throw new Error(`Unknown report type: ${type}`);
  }
}
