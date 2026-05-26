import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BillingService } from "./billing.service.js";
import { ChangePlanDto } from "./dto/change-plan.dto.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthRequestUser } from "../auth/jwt.strategy.js";
import { PRICING_TABLE, type PlanCode } from "./pricing.js";

@ApiTags("billing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  @ApiOperation({ summary: "Каталог тарифов" })
  plans() {
    return PRICING_TABLE;
  }

  @Get("subscription")
  current(@CurrentUser() user: AuthRequestUser) {
    return this.billing.getCurrentSubscription(user.tenantSlug);
  }

  @Get("transactions")
  @Roles("OWNER", "ADMIN")
  transactions(@CurrentUser() user: AuthRequestUser) {
    return this.billing.listTransactions(user.tenantSlug);
  }

  @Get("preview")
  @Roles("OWNER", "ADMIN")
  preview(
    @Query("plan") plan: PlanCode,
    @Query("period") period: "MONTHLY" | "YEARLY",
    @CurrentUser() user: AuthRequestUser,
  ) {
    return this.billing.previewChange(user.tenantSlug, plan, period);
  }

  @Post("change-plan")
  @Roles("OWNER", "ADMIN")
  change(@Body() dto: ChangePlanDto, @CurrentUser() user: AuthRequestUser) {
    return this.billing.changePlan(user.tenantSlug, dto.plan, dto.period);
  }
}
