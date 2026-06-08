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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
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
  constructor(private readonly payroll: PayrollService) {}

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
