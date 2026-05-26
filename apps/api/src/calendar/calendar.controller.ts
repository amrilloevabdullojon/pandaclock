import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional } from "class-validator";
import { CalendarService } from "./calendar.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

class CalendarQueryDto {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;

  @IsOptional()
  @IsIn(["my", "team", "all"])
  scope?: "my" | "team" | "all";
}

@ApiTags("calendar")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("calendar")
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get("events")
  @ApiOperation({ summary: "События календаря: отпуска + дедлайны задач" })
  events(@Query() query: CalendarQueryDto, @CurrentUser() user: AuthRequestUser) {
    return this.calendar.events(query.start, query.end, user.id, query.scope ?? "all");
  }
}
