import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { TimeService } from "./time.service.js";
import { StartDayDto, FinishDayDto, BreakDto } from "./dto/start-day.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("time")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("time")
export class TimeController {
  constructor(private readonly time: TimeService) {}

  @Get("today")
  @ApiOperation({ summary: "Текущая сессия сотрудника на сегодня" })
  today(@CurrentUser() user: AuthRequestUser) {
    return this.time.getToday(user.id, user.tenantSlug);
  }

  @Post("start")
  @ApiOperation({ summary: "Начать рабочий день" })
  start(@Body() dto: StartDayDto, @CurrentUser() user: AuthRequestUser, @Req() req: Request) {
    return this.time.startDay(user.id, user.tenantSlug, dto, { ipAddress: req.ip });
  }

  @Post("finish")
  @ApiOperation({ summary: "Завершить день" })
  finish(@Body() dto: FinishDayDto, @CurrentUser() user: AuthRequestUser) {
    return this.time.finishDay(user.id, user.tenantSlug, dto);
  }

  @Post("break/start")
  @HttpCode(200)
  @ApiOperation({ summary: "Начать перерыв" })
  startBreak(@Body() dto: BreakDto, @CurrentUser() user: AuthRequestUser) {
    return this.time.startBreak(user.id, user.tenantSlug, dto.type ?? "PERSONAL");
  }

  @Post("break/finish")
  @HttpCode(200)
  @ApiOperation({ summary: "Завершить перерыв" })
  finishBreak(@CurrentUser() user: AuthRequestUser) {
    return this.time.finishBreak(user.id, user.tenantSlug);
  }

  @Get("history")
  @ApiOperation({ summary: "История смен сотрудника" })
  history(@CurrentUser() user: AuthRequestUser, @Query("days") days?: string) {
    return this.time.listHistory(user.id, days ? Number(days) : 30);
  }

  @Get("who-is-working")
  @ApiOperation({ summary: "Live-список: кто сейчас на работе" })
  whoIsWorking() {
    return this.time.whoIsWorking();
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Сводка по компании на сегодня" })
  dashboard() {
    return this.time.getDashboardCounts();
  }

  @Get("dashboard/trends")
  @ApiOperation({ summary: "Sparkline + trend % для KPI dashboard" })
  dashboardTrends(@Query("days") days?: string) {
    return this.time.getDashboardTrends(days ? Number(days) : 14);
  }
}
