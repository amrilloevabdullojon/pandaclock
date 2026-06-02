import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TenantService } from "./tenant.service.js";
import { UpdateTimePolicyDto } from "./dto/policy.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";
import type { TimePolicy } from "../time/time-policy.js";

@ApiTags("tenant")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tenant")
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  @Get("policy")
  @ApiOperation({ summary: "Текущая time policy + geofence" })
  getPolicy(@CurrentUser() user: AuthRequestUser): Promise<TimePolicy> {
    return this.tenants.getPolicy(user.tenantSlug);
  }

  @Patch("policy")
  @Roles("OWNER", "ADMIN", "HR")
  @ApiOperation({ summary: "Обновить time policy / geofence (только руководство)" })
  updatePolicy(
    @CurrentUser() user: AuthRequestUser,
    @Body() dto: UpdateTimePolicyDto,
  ): Promise<TimePolicy> {
    return this.tenants.updatePolicy(user.tenantSlug, dto);
  }
}
