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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ShiftsService, type ShiftRow } from "./shifts.service.js";
import { CreateShiftDto, ShiftRangeDto, UpdateShiftDto } from "./dto/shift.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";

@ApiTags("shifts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("shifts")
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Смены в диапазоне дат (планировщик)" })
  list(@Query() query: ShiftRangeDto): Promise<ShiftRow[]> {
    return this.shifts.listRange(query.start, query.end);
  }

  @Get("my")
  @ApiOperation({ summary: "Мои смены в диапазоне дат" })
  my(@Query() query: ShiftRangeDto, @CurrentUser() user: AuthRequestUser): Promise<ShiftRow[]> {
    return this.shifts.listForUser(user.id, query.start, query.end);
  }

  @Post()
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @HttpCode(201)
  create(@Body() dto: CreateShiftDto, @CurrentUser() user: AuthRequestUser): Promise<ShiftRow> {
    return this.shifts.create(dto, user.id);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateShiftDto): Promise<ShiftRow> {
    return this.shifts.update(id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @HttpCode(204)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.shifts.remove(id);
  }
}
