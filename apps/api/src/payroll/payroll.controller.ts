import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ExportService } from "../reports/export.service.js";
import {
  PayrollService,
  type MyPayslip,
  type Payslip,
  type PayrollRun,
  type PayrollRunDetail,
  type SalaryHistoryItem,
  type SalaryRow,
} from "./payroll.service.js";
import {
  CreateRunDto,
  SetSalaryDto,
  UpdatePayslipDto,
  UpdateRunStatusDto,
} from "./dto/payroll.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("payroll")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payroll")
export class PayrollController {
  constructor(
    private readonly payroll: PayrollService,
    private readonly exporter: ExportService,
  ) {}

  /* ───────── Сотрудник ───────── */

  @Get("payslips/my")
  @ApiOperation({ summary: "Мои расчётные листки" })
  myPayslips(@CurrentUser() user: AuthRequestUser): Promise<MyPayslip[]> {
    return this.payroll.listMyPayslips(user.id);
  }

  /* ───────── Оклады ───────── */

  @Get("salaries")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Текущие оклады активных сотрудников" })
  salaries(): Promise<SalaryRow[]> {
    return this.payroll.listSalaries();
  }

  @Put("salaries/:userId")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Назначить оклад сотруднику" })
  setSalary(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: SetSalaryDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<SalaryHistoryItem> {
    return this.payroll.setSalary(userId, dto, user.id);
  }

  @Get("salaries/:userId/history")
  @Roles("OWNER", "ADMIN", "HR")
  salaryHistory(@Param("userId", ParseUUIDPipe) userId: string): Promise<SalaryHistoryItem[]> {
    return this.payroll.salaryHistory(userId);
  }

  /* ───────── Расчётные периоды ───────── */

  @Get("runs")
  @Roles("OWNER", "ADMIN", "HR")
  listRuns(): Promise<PayrollRun[]> {
    return this.payroll.listRuns();
  }

  @Post("runs")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  @ApiOperation({ summary: "Создать период и сгенерировать листки из окладов" })
  createRun(
    @Body() dto: CreateRunDto,
    @CurrentUser() user: AuthRequestUser,
  ): Promise<PayrollRunDetail> {
    return this.payroll.createRun(dto, user.id);
  }

  @Get("runs/:id")
  @Roles("OWNER", "ADMIN", "HR")
  getRun(@Param("id", ParseUUIDPipe) id: string): Promise<PayrollRunDetail> {
    return this.payroll.getRun(id);
  }

  @Get("runs/:id/export")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Экспорт ведомости (xlsx | pdf)" })
  async exportRun(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("format") format: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const run = await this.payroll.getRun(id);
    const title = `Ведомость ${run.period}`;
    const headers = ["Сотрудник", "Оклад", "Премия", "Удержания", "К выплате", "Валюта"];
    const rows: (string | number)[][] = run.payslips.map((p) => [
      p.userName,
      p.baseAmount,
      p.bonus,
      p.deductions,
      p.netAmount,
      p.currency,
    ]);
    const fmt = format === "pdf" ? "pdf" : "xlsx";
    const buffer =
      fmt === "pdf"
        ? await this.exporter.toPdf(title, headers, rows)
        : this.exporter.toExcel(title, headers, rows);
    const safePeriod = run.period.replace(/[^a-zA-Zа-яА-Я0-9]+/g, "_");
    res.setHeader(
      "Content-Type",
      fmt === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="payroll-${safePeriod}.${fmt}"`);
    res.send(buffer);
  }

  @Patch("runs/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Сменить статус периода (утвердить / выплатить)" })
  updateRun(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRunStatusDto,
  ): Promise<PayrollRunDetail> {
    return this.payroll.updateRunStatus(id, dto.status as "APPROVED" | "PAID");
  }

  @Delete("runs/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeRun(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.payroll.removeRun(id);
  }

  @Patch("payslips/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Изменить листок (премия/удержания/примечание)" })
  updatePayslip(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayslipDto,
  ): Promise<Payslip> {
    return this.payroll.updatePayslip(id, dto);
  }
}
