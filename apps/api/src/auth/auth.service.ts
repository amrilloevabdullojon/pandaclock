import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { TenantService } from "../tenant/tenant.service.js";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantSlug: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantDb: TenantPrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, tenantSlug: string): Promise<AuthTokens> {
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }

    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<UserRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, role, status
       FROM users WHERE email = $1 LIMIT 1`,
      email.toLowerCase(),
    );

    const user = rows[0];
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenantSlug,
    });
  }

  private async issueTokens(user: AuthenticatedUser): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role, tenant: user.tenantSlug };
    const accessTtl = process.env.JWT_ACCESS_TTL ?? "15m";
    const refreshTtl = process.env.JWT_REFRESH_TTL ?? "30d";

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: refreshTtl,
    });

    return { accessToken, refreshToken, expiresIn: this.parseExpiresIn(accessTtl) };
  }

  private parseExpiresIn(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit ?? "s"] ?? 1;
    return value * multiplier;
  }
}
