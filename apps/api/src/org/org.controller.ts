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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrgService, type OrgChart, type StaffPosition } from "./org.service.js";
import { CreateStaffPositionDto, UpdateStaffPositionDto } from "./dto/org.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";

@ApiTags("org")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("org")
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get("chart")
  @ApiOperation({ summary: "Оргструктура компании (отделы + сотрудники)" })
  chart(): Promise<OrgChart> {
    return this.org.chart();
  }

  @Get("staffing")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Штатное расписание (план/факт по позициям)" })
  listStaffing(): Promise<StaffPosition[]> {
    return this.org.listStaffing();
  }

  @Post("staffing")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(201)
  createStaffing(@Body() dto: CreateStaffPositionDto): Promise<StaffPosition> {
    return this.org.createStaffing(dto);
  }

  @Patch("staffing/:id")
  @Roles("OWNER", "ADMIN", "HR")
  updateStaffing(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffPositionDto,
  ): Promise<StaffPosition> {
    return this.org.updateStaffing(id, dto);
  }

  @Delete("staffing/:id")
  @Roles("OWNER", "ADMIN", "HR")
  @HttpCode(204)
  removeStaffing(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.org.removeStaffing(id);
  }
}
