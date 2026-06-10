import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnalyticsService, type ManagementOverview } from "./analytics.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  @Roles("OWNER", "ADMIN", "HR", "MANAGER")
  @ApiOperation({ summary: "Кросс-модульные KPI для руководителя" })
  overview(): Promise<ManagementOverview> {
    return this.analytics.overview();
  }
}
