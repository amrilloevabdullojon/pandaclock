import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { TenantService } from "../tenant/tenant.service.js";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { EmailService } from "../email/email.service.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  email_verified_at: Date | null;
}

interface RefreshRow {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "30d";
const REFRESH_DAYS = 30;
const VERIFICATION_TTL_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantDb: TenantPrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  /* ---------- Login ---------- */

  async login(
    email: string,
    password: string,
    tenantSlug: string,
    ctx: SessionContext = {},
  ): Promise<AuthTokens> {
    const tenant = await this.tenantService.findBySlug(tenantSlug);
    if (!tenant) throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });

    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<UserRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, role, status, email_verified_at
       FROM users WHERE email = $1 LIMIT 1`,
      email.toLowerCase(),
    );

    const user = rows[0];
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });

    const tokens = await this.issueTokens(user, tenantSlug, ctx);

    // Login-alert email отправляем fire-and-forget — не блокируем ответ.
    if (ctx.ipAddress && ctx.userAgent) {
      void this.email
        .sendLoginAlert({
          to: user.email,
          firstName: user.first_name,
          ip: ctx.ipAddress,
          userAgent: ctx.userAgent,
          when: new Date(),
        })
        .catch(() => undefined);
    }

    return tokens;
  }

  /* ---------- Refresh ---------- */

  async refresh(refreshToken: string, tenantSlug: string, ctx: SessionContext = {}): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken, tenantSlug);
    const tokenHash = this.hash(refreshToken);

    const client = await this.tenantDb.getClient();
    const tokens = await client.$queryRawUnsafe<RefreshRow[]>(
      `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
      tokenHash,
    );
    const token = tokens[0];
    if (!token || token.revoked_at || token.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException({ code: "REFRESH_INVALID" });
    }

    const users = await client.$queryRawUnsafe<UserRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, role, status, email_verified_at
       FROM users WHERE id = $1 LIMIT 1`,
      payload.sub,
    );
    const user = users[0];
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "USER_INACTIVE" });
    }

    // Rotation: revoke предыдущий, выдать новые
    await client.$executeRawUnsafe(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      token.id,
    );
    return this.issueTokens(user, tenantSlug, ctx, token.id);
  }

  /* ---------- Logout ---------- */

  async logout(refreshToken: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      this.hash(refreshToken),
    );
  }

  /* ---------- /me ---------- */

  async getMe(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
  }> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<UserRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, role, status, email_verified_at
       FROM users WHERE id = $1 LIMIT 1`,
      userId,
    );
    const user = rows[0];
    if (!user) throw new NotFoundException({ code: "USER_NOT_FOUND" });
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified_at !== null,
    };
  }

  /* ---------- Email verification ---------- */

  async issueVerificationToken(userId: string, email: string, firstName: string): Promise<void> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hash(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    const client = await this.tenantDb.getClient();
    await client.$executeRawUnsafe(
      `INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at)
       VALUES ($1, $2, 'EMAIL', $3)`,
      userId,
      tokenHash,
      expiresAt,
    );

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;
    await this.email.sendEmailVerification({ to: email, firstName, verificationUrl });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    const client = await this.tenantDb.getClient();

    const rows = await client.$queryRawUnsafe<
      { id: string; user_id: string; expires_at: Date; consumed_at: Date | null }[]
    >(
      `SELECT id, user_id, expires_at, consumed_at
       FROM verification_tokens
       WHERE token_hash = $1 AND purpose = 'EMAIL' LIMIT 1`,
      tokenHash,
    );
    const record = rows[0];
    if (!record || record.consumed_at || record.expires_at.getTime() < Date.now()) {
      throw new BadRequestException({ code: "VERIFICATION_TOKEN_INVALID" });
    }

    await client.$executeRawUnsafe(
      `UPDATE verification_tokens SET consumed_at = NOW() WHERE id = $1`,
      record.id,
    );
    await client.$executeRawUnsafe(
      `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
      record.user_id,
    );
  }

  async resendVerification(email: string): Promise<void> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<UserRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, role, status, email_verified_at
       FROM users WHERE email = $1 LIMIT 1`,
      email.toLowerCase(),
    );
    const user = rows[0];
    // Молча игнорируем несуществующих пользователей (не раскрываем enumeration).
    if (!user || user.email_verified_at) return;
    await this.issueVerificationToken(user.id, user.email, user.first_name);
  }

  /* ---------- Internal helpers ---------- */

  private async issueTokens(
    user: UserRow,
    tenantSlug: string,
    ctx: SessionContext,
    previousRefreshId?: string,
  ): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant: tenantSlug,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: ACCESS_TTL,
    });

    const refreshRaw = this.generateRawToken();
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: refreshRaw },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: REFRESH_TTL },
    );
    const refreshHash = this.hash(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

    const client = await this.tenantDb.getClient();
    const inserted = await client.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4::inet, $5)
       RETURNING id`,
      user.id,
      refreshHash,
      expiresAt,
      ctx.ipAddress ?? null,
      ctx.userAgent ?? null,
    );

    if (previousRefreshId && inserted[0]) {
      await client.$executeRawUnsafe(
        `UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2`,
        inserted[0].id,
        previousRefreshId,
      );
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(ACCESS_TTL),
    };
  }

  private async verifyRefreshToken(
    token: string,
    expectedTenantSlug: string,
  ): Promise<{ sub: string; tenant: string }> {
    try {
      const decoded = await this.jwt.verifyAsync<{ sub: string; tenant: string }>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      if (decoded.tenant !== expectedTenantSlug) {
        throw new UnauthorizedException({ code: "TENANT_MISMATCH" });
      }
      return decoded;
    } catch {
      throw new UnauthorizedException({ code: "REFRESH_INVALID" });
    }
  }

  private hash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  private generateRawToken(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private parseExpiresIn(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2] ?? "s";
    const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multiplier[unit] ?? 1);
  }
}
