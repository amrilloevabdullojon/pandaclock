import { Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { OnboardingService } from "./onboarding.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";

@ApiTags("onboarding")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get("status")
  @ApiOperation({ summary: "Прогресс онбординга текущего тенанта" })
  status(@Req() req: Request) {
    if (!req.tenant) throw new Error("tenant required");
    return this.onboarding.getStatus(req.tenant.slug);
  }

  @Post("dismiss")
  @HttpCode(204)
  @ApiOperation({ summary: "Скрыть подсказки онбординга навсегда" })
  async dismiss(@Req() req: Request): Promise<void> {
    if (!req.tenant) throw new Error("tenant required");
    await this.onboarding.dismiss(req.tenant.slug);
  }
}
