import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService, type AuthTokens, type SessionContext } from "./auth.service.js";
import { TenantService } from "../tenant/tenant.service.js";
import { EmailService } from "../email/email.service.js";
import { RegisterCompanyDto } from "./dto/register-company.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RefreshDto } from "./dto/refresh.dto.js";
import { VerifyEmailDto, ResendVerificationDto } from "./dto/verify-email.dto.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { CurrentUser } from "./current-user.decorator.js";
import type { AuthRequestUser } from "./jwt.strategy.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  @Post("register-company")
  @HttpCode(201)
  @ApiOperation({ summary: "Регистрация новой компании-клиента" })
  async registerCompany(@Body() dto: RegisterCompanyDto): Promise<{
    tenant: { id: string; slug: string; name: string };
    verificationSent: boolean;
  }> {
    const tenant = await this.tenantService.createTenant({
      slug: dto.slug,
      name: dto.companyName,
      industry: dto.industry,
      timezone: dto.timezone,
      admin: {
        email: dto.adminEmail,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        middleName: dto.adminMiddleName,
        phone: dto.adminPhone,
        password: dto.adminPassword,
      },
    });

    // После создания tenant нужно переключиться на его schema, чтобы выпустить verification token.
    // TenantMiddleware на этом эндпоинте не работает (нет ещё subdomain), поэтому делаем явно.
    try {
      await this.tenantService.runInTenantSchema(tenant.schemaName, async (client) => {
        const rows = await client.$queryRawUnsafe<{ id: string; email: string; first_name: string }[]>(
          `SELECT id, email, first_name FROM users WHERE email = $1 LIMIT 1`,
          dto.adminEmail.toLowerCase(),
        );
        const user = rows[0];
        if (!user) return;
        const appUrl = process.env.APP_URL ?? "http://localhost:3000";
        const rawToken = await this.tenantService.createVerificationToken(client, user.id, "EMAIL");
        await this.emailService.sendWelcome({
          to: user.email,
          firstName: user.first_name,
          verificationUrl: `${appUrl}/verify-email?token=${rawToken}&tenant=${tenant.slug}`,
        });
      });
    } catch {
      // Письмо не должно блокировать регистрацию.
    }

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      verificationSent: true,
    };
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Вход в систему" })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokens> {
    if (!req.tenant) throw new UnauthorizedException({ code: "TENANT_REQUIRED" });
    const ctx = this.extractContext(req);
    return this.authService.login(dto.email, dto.password, req.tenant.slug, ctx);
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Обмен refresh token на новую пару" })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<AuthTokens> {
    if (!req.tenant) throw new UnauthorizedException({ code: "TENANT_REQUIRED" });
    const ctx = this.extractContext(req);
    return this.authService.refresh(dto.refreshToken, req.tenant.slug, ctx);
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOperation({ summary: "Logout: revoke refresh token" })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post("verify-email")
  @HttpCode(200)
  @ApiOperation({ summary: "Подтверждение email по токену из письма" })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: true }> {
    await this.authService.verifyEmail(dto.token);
    return { verified: true };
  }

  @Post("resend-verification")
  @HttpCode(202)
  @ApiOperation({ summary: "Повторно отправить письмо подтверждения" })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ accepted: true }> {
    await this.authService.resendVerification(dto.email);
    return { accepted: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Текущий пользователь" })
  async me(@CurrentUser() user: AuthRequestUser) {
    return this.authService.getMe(user.id);
  }

  private extractContext(req: Request): SessionContext {
    const ip = req.ip ?? (req.headers["x-forwarded-for"] as string | undefined) ?? undefined;
    const userAgent = req.headers["user-agent"] ?? undefined;
    return { ipAddress: ip, userAgent };
  }
}
