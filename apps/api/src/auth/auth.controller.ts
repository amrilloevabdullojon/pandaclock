import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService, type AuthTokens } from "./auth.service.js";
import { TenantService } from "../tenant/tenant.service.js";
import { RegisterCompanyDto } from "./dto/register-company.dto.js";
import { LoginDto } from "./dto/login.dto.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly authService: AuthService,
  ) {}

  @Post("register-company")
  @HttpCode(201)
  @ApiOperation({ summary: "Регистрация новой компании-клиента" })
  async registerCompany(@Body() dto: RegisterCompanyDto): Promise<{
    tenant: { id: string; slug: string; name: string };
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
    return { tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } };
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Вход в систему (tenant определяется по поддомену)" })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokens> {
    if (!req.tenant) {
      throw new Error("Tenant must be resolved before login");
    }
    return this.authService.login(dto.email, dto.password, req.tenant.slug);
  }
}
