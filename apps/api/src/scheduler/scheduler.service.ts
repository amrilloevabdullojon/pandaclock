import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { prisma, PrismaClient } from "@pandaclock/db";
import { EmailService } from "../email/email.service.js";

/**
 * Глобальные cron-задачи Pandaclock.
 *
 * ВАЖНО: бежит на КАЖДОЙ инстансе API, поэтому в production нужен лидер-выбор
 * (Redis lock) или single-instance worker. Sprint 8 — best-effort.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly email: EmailService) {}

  /**
   * 09:00 UTC → 14:00 в Узбекистане. Для prod добавить per-tenant таймзону.
   * Sprint 8 MVP — один глобальный тик.
   */
  @Cron("0 9 * * *", { name: "morning-reminders" })
  async sendMorningReminders(): Promise<void> {
    this.logger.log("running morning reminders");
    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, slug: true, schemaName: true },
    });

    for (const tenant of tenants) {
      try {
        await this.sendForTenant(tenant.schemaName);
      } catch (error) {
        this.logger.warn({ err: error, tenant: tenant.slug }, "reminder failed for tenant");
      }
    }
  }

  /**
   * Ежедневно в 00:05 — уведомления о приближающемся окончании триала.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "trial-warning" })
  async sendTrialWarnings(): Promise<void> {
    this.logger.log("running trial warnings");
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { lte: threeDaysFromNow, gte: new Date() },
      },
      select: { slug: true, name: true, trialEndsAt: true, schemaName: true },
    });

    for (const tenant of tenants) {
      try {
        await this.warnTrialEndForTenant(tenant.schemaName, tenant.name, tenant.trialEndsAt);
      } catch (error) {
        this.logger.warn({ err: error, tenant: tenant.slug }, "trial warning failed");
      }
    }
  }

  /* ---------- Internal helpers ---------- */

  private async sendForTenant(schemaName: string): Promise<void> {
    const client = new PrismaClient();
    try {
      await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
      const users = await client.$queryRawUnsafe<
        { email: string; first_name: string }[]
      >(
        `SELECT u.email, u.first_name
         FROM users u
         LEFT JOIN time_entries te ON te.user_id = u.id AND te.date = CURRENT_DATE
         WHERE u.status = 'ACTIVE' AND te.id IS NULL
         LIMIT 1000`,
      );
      for (const user of users) {
        await this.email.send({
          to: user.email,
          subject: "☀️ Доброе утро! Не забудьте отметиться",
          html: `<p>Привет, ${user.first_name}!</p><p>Откройте Pandaclock и начните рабочий день.</p>`,
        });
      }
    } finally {
      await client.$disconnect();
    }
  }

  private async warnTrialEndForTenant(
    schemaName: string,
    tenantName: string,
    trialEndsAt: Date | null,
  ): Promise<void> {
    if (!trialEndsAt) return;
    const client = new PrismaClient();
    try {
      await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
      const admins = await client.$queryRawUnsafe<{ email: string; first_name: string }[]>(
        `SELECT email, first_name FROM users WHERE role IN ('OWNER', 'ADMIN') AND status = 'ACTIVE' LIMIT 10`,
      );
      for (const admin of admins) {
        await this.email.send({
          to: admin.email,
          subject: "⏰ Триал Pandaclock скоро закончится",
          html: `<p>Здравствуйте, ${admin.first_name}!</p>
                 <p>Триал-период компании <strong>${tenantName}</strong> заканчивается ${trialEndsAt.toLocaleDateString("ru-RU")}.</p>
                 <p>Выберите тариф, чтобы продолжить работу: <a href="https://pandaclock.uz/dashboard/settings/billing">Перейти к биллингу</a></p>`,
        });
      }
    } finally {
      await client.$disconnect();
    }
  }
}
