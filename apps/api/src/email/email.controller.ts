import { Body, Controller, ForbiddenException, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { EmailService } from "./email.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/permissions.guard.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";

/**
 * Тестовый эндпойнт для проверки настройки SMTP/Resend без триггера реальных
 * флоу (invite, reset). Доступен только владельцу тенанта (tenant:settings).
 *
 * Полезно после `fly secrets set RESEND_API_KEY=...` — проверить что письмо
 * реально доходит до inbox.
 */
@ApiTags("email")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("email")
export class EmailController {
  constructor(private readonly email: EmailService) {}

  @Post("test")
  @RequirePermissions("tenant:settings")
  @ApiOperation({ summary: "Отправить тестовое письмо (для verifyation transport)" })
  async sendTest(@Body() body: { to?: string }): Promise<{ sent: boolean }> {
    if (!body.to) throw new ForbiddenException({ code: "TO_REQUIRED" });
    await this.email.send({
      to: body.to,
      subject: "Pandaclock — тест отправки",
      html: `<p>Если вы видите это письмо — email-транспорт настроен правильно. ✅</p>`,
    });
    return { sent: true };
  }
}
