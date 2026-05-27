import { BadRequestException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { EmailService } from "../email/email.service.js";
import type { InviteEmployeeEntry } from "./dto/invite-employee.dto.js";

export interface InviteOutcome {
  invited: string[];
  skipped: { email: string; reason: string }[];
}

const INVITE_TTL_HOURS = 168; // 7 дней

@Injectable()
export class InvitationsService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly email: EmailService,
  ) {}

  async invite(
    invitees: InviteEmployeeEntry[],
    tenantSlug: string,
    invitedBy: { firstName: string; lastName: string },
  ): Promise<InviteOutcome> {
    const result: InviteOutcome = { invited: [], skipped: [] };
    const client = await this.tenantDb.getClient();

    for (const invitee of invitees) {
      const email = invitee.email.toLowerCase();
      const existing = await client.$queryRawUnsafe<{ id: string; status: string }[]>(
        `SELECT id, status FROM users WHERE email = $1 LIMIT 1`,
        email,
      );
      if (existing[0]) {
        result.skipped.push({ email, reason: existing[0].status === "ACTIVE" ? "ALREADY_ACTIVE" : "ALREADY_INVITED" });
        continue;
      }

      const userRows = await client.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, status, position, department_id)
         VALUES ($1, '', $2, $3, 'EMPLOYEE', 'PENDING', $4, $5)
         RETURNING id`,
        email,
        invitee.firstName ?? "",
        invitee.lastName ?? "",
        invitee.position ?? null,
        invitee.departmentId ?? null,
      );
      const userId = userRows[0]?.id;
      if (!userId) {
        result.skipped.push({ email, reason: "INSERT_FAILED" });
        continue;
      }

      const rawToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
      await client.$executeRawUnsafe(
        `INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at)
         VALUES ($1, $2, 'INVITE', $3)`,
        userId,
        tokenHash,
        expiresAt,
      );

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const url = `${appUrl}/accept-invite?token=${rawToken}&tenant=${tenantSlug}`;

      await this.email
        .send({
          to: email,
          subject: `${invitedBy.firstName} ${invitedBy.lastName} приглашает вас в Pandaclock`,
          html: `
            <p>Привет!</p>
            <p>${invitedBy.firstName} ${invitedBy.lastName} приглашает вас присоединиться к рабочему пространству на Pandaclock.</p>
            <p><a href="${url}" style="display:inline-block;background:#5B4FE2;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;">Принять приглашение</a></p>
            <p>Ссылка действительна 7 дней.</p>
          `,
        })
        .catch(() => undefined);

      result.invited.push(email);
    }

    return result;
  }

  async acceptInvite(input: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ userId: string }> {
    if (input.password.length < 8) {
      throw new BadRequestException({ code: "PASSWORD_TOO_SHORT" });
    }
    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ id: string; user_id: string; expires_at: Date; consumed_at: Date | null }[]>(
      `SELECT id, user_id, expires_at, consumed_at
       FROM verification_tokens
       WHERE token_hash = $1 AND purpose = 'INVITE' LIMIT 1`,
      tokenHash,
    );
    const token = rows[0];
    if (!token || token.consumed_at || token.expires_at.getTime() < Date.now()) {
      throw new BadRequestException({ code: "INVITE_INVALID" });
    }

    const passwordHash = await bcrypt.hash(input.password, Number(process.env.BCRYPT_ROUNDS ?? 10));
    await client.$executeRawUnsafe(
      `UPDATE users
         SET password_hash = $2,
             first_name = COALESCE(NULLIF($3, ''), first_name),
             last_name = COALESCE(NULLIF($4, ''), last_name),
             status = 'ACTIVE',
             email_verified_at = NOW(),
             pd_consent_at = NOW(),
             updated_at = NOW()
       WHERE id = $1::uuid`,
      token.user_id,
      passwordHash,
      input.firstName ?? "",
      input.lastName ?? "",
    );
    await client.$executeRawUnsafe(
      `UPDATE verification_tokens SET consumed_at = NOW() WHERE id = $1::uuid`,
      token.id,
    );

    return { userId: token.user_id };
  }
}
