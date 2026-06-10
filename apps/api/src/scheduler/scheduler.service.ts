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

  /**
   * Еженедельно (пн 10:00 UTC = 15:00 в Ташкенте) — напоминания о
   * незавершённых опросах/курсах и зависших согласованиях. In-app уведомления.
   */
  @Cron("0 10 * * 1", { name: "engagement-reminders" })
  async sendEngagementReminders(): Promise<void> {
    this.logger.log("running engagement reminders");
    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { slug: true, schemaName: true },
    });
    for (const tenant of tenants) {
      try {
        await this.sendEngagementForTenant(tenant.schemaName);
      } catch (error) {
        this.logger.warn({ err: error, tenant: tenant.slug }, "engagement reminder failed");
      }
    }
  }

  private async sendEngagementForTenant(schemaName: string): Promise<void> {
    const client = new PrismaClient();
    try {
      await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

      const notify = async (
        userIds: string[],
        type: string,
        title: string,
        body: string,
        link: string,
      ): Promise<void> => {
        if (userIds.length === 0) return;
        const valuesSql: string[] = [];
        const params: unknown[] = [];
        userIds.forEach((uid, idx) => {
          const b = idx * 5;
          valuesSql.push(
            `($${b + 1}::uuid, $${b + 2}::varchar, $${b + 3}::text, $${b + 4}::text, $${b + 5}::text)`,
          );
          params.push(uid, type, title, body, link);
        });
        await client.$executeRawUnsafe(
          `INSERT INTO notifications (user_id, type, title, body, link) VALUES ${valuesSql.join(", ")}`,
          ...params,
        );
      };

      // 1. Сотрудники с незавершёнными активными опросами.
      const surveyUsers = await client.$queryRawUnsafe<{ id: string }[]>(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN surveys s ON s.status = 'ACTIVE'
         WHERE u.status = 'ACTIVE'
           AND NOT EXISTS (
             SELECT 1 FROM survey_responses r WHERE r.survey_id = s.id AND r.user_id = u.id
           )
         LIMIT 1000`,
      );
      await notify(
        surveyUsers.map((u) => u.id),
        "survey_reminder",
        "Незавершённый опрос",
        "Пройдите активный опрос — это займёт пару минут",
        "/dashboard/surveys",
      );

      // 2. Сотрудники с незавершёнными курсами.
      const courseUsers = await client.$queryRawUnsafe<{ user_id: string }[]>(
        `SELECT DISTINCT e.user_id
         FROM course_enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE c.status = 'PUBLISHED' AND e.completed_at IS NULL
         LIMIT 1000`,
      );
      await notify(
        courseUsers.map((u) => u.user_id),
        "course_reminder",
        "Продолжите обучение",
        "У вас есть незавершённый курс",
        "/dashboard/knowledge",
      );

      // 3. Зависшие согласования (старше 2 дней) → напомнить согласующим.
      const pending = await client.$queryRawUnsafe<{ c: number }[]>(
        `SELECT (
           (SELECT COUNT(*) FROM business_trips WHERE status = 'SUBMITTED' AND created_at < NOW() - INTERVAL '2 days')
           + (SELECT COUNT(*) FROM expenses WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '2 days')
         )::int AS c`,
      );
      const pendingCount = pending[0]?.c ?? 0;
      if (pendingCount > 0) {
        const approvers = await client.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM users WHERE status = 'ACTIVE' AND role IN ('OWNER', 'ADMIN', 'HR', 'MANAGER') LIMIT 100`,
        );
        await notify(
          approvers.map((a) => a.id),
          "approval_reminder",
          "Заявки ждут согласования",
          `${pendingCount} заявок ожидают вашего решения`,
          "/dashboard/approvals",
        );
      }
    } finally {
      await client.$disconnect();
    }
  }

  /* ---------- Internal helpers ---------- */

  private async sendForTenant(schemaName: string): Promise<void> {
    const client = new PrismaClient();
    try {
      await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
      const users = await client.$queryRawUnsafe<{ email: string; first_name: string }[]>(
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
