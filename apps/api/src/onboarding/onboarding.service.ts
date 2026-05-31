import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import { TenantService } from "../tenant/tenant.service.js";

export interface OnboardingStep {
  /** Стабильный ключ — UI делает по нему ссылку и иконку. */
  key: "departments" | "employees" | "tasks" | "time";
  done: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  /** ISO-дата когда пользователь нажал «Скрыть подсказки», либо null. */
  dismissedAt: string | null;
}

/**
 * Бизнес-правила онбординга нового тенанта.
 *
 * Шаги вычисляются динамически (count > 0/1), не через флаги в БД —
 * чтобы галочки появлялись сами по мере реальной работы юзера.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly tenantDb: TenantPrismaService,
    private readonly tenants: TenantService,
  ) {}

  async getStatus(tenantSlug: string): Promise<OnboardingStatus> {
    const client = await this.tenantDb.getClient();

    // Все 4 запроса последовательно — параллельные могут попасть в разные
    // pool-соединения без установленного search_path (см. CLAUDE.md).
    const [departmentsCount] = await client.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*)::bigint AS count FROM departments`,
    );
    const [usersCount] = await client.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*)::bigint AS count FROM users WHERE status = 'ACTIVE'`,
    );
    const [tasksCount] = await client.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*)::bigint AS count FROM tasks`,
    );
    const [timeCount] = await client.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*)::bigint AS count FROM time_entries`,
    );

    const steps: OnboardingStep[] = [
      { key: "departments", done: Number(departmentsCount?.count ?? 0) > 0 },
      { key: "employees", done: Number(usersCount?.count ?? 0) > 1 }, // >1: владелец уже есть
      { key: "tasks", done: Number(tasksCount?.count ?? 0) > 0 },
      { key: "time", done: Number(timeCount?.count ?? 0) > 0 },
    ];

    const tenant = await this.tenants.findBySlug(tenantSlug);
    const dismissedAt = readDismissedAt(tenant?.metadata);

    return {
      steps,
      completedCount: steps.filter((s) => s.done).length,
      totalCount: steps.length,
      dismissedAt,
    };
  }

  async dismiss(tenantSlug: string): Promise<void> {
    const tenant = await this.tenants.findBySlug(tenantSlug);
    if (!tenant) return;
    const metadata = (tenant.metadata as Record<string, unknown> | null) ?? {};
    const onboarding = (metadata.onboarding as Record<string, unknown> | undefined) ?? {};
    const updated = {
      ...metadata,
      onboarding: { ...onboarding, dismissedAt: new Date().toISOString() },
    };
    await this.tenants.updateMetadata(tenantSlug, updated);
  }
}

function readDismissedAt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const onboarding = (metadata as Record<string, unknown>).onboarding;
  if (!onboarding || typeof onboarding !== "object") return null;
  const v = (onboarding as Record<string, unknown>).dismissedAt;
  return typeof v === "string" ? v : null;
}
