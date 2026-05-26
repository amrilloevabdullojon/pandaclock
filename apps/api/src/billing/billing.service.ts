import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@pandaclock/db";
import { TenantPrismaService } from "../tenant/tenant-prisma.service.js";
import {
  PRICING_TABLE,
  calculatePrice,
  planCanFit,
  type PlanCode,
} from "./pricing.js";

export interface CurrentSubscription {
  plan: PlanCode;
  planName: string;
  modules: string[];
  employeesLimit: number;
  billingPeriod: "MONTHLY" | "YEARLY";
  priceAmount: number;
  priceCurrency: string;
  startedAt: Date;
  expiresAt: Date;
  activeEmployees: number;
  trialEndsAt: Date | null;
}

@Injectable()
export class BillingService {
  constructor(private readonly tenantDb: TenantPrismaService) {}

  async getCurrentSubscription(tenantSlug: string): Promise<CurrentSubscription> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { subscription: true },
    });
    if (!tenant || !tenant.subscription) {
      throw new NotFoundException({ code: "SUBSCRIPTION_NOT_FOUND" });
    }

    const activeEmployees = await this.countActiveEmployees();
    const sub = tenant.subscription;
    const planCode = sub.plan as PlanCode;

    return {
      plan: planCode,
      planName: PRICING_TABLE[planCode].name,
      modules: Array.isArray(sub.modules) ? (sub.modules as string[]) : [],
      employeesLimit: sub.employeesLimit,
      billingPeriod: sub.billingPeriod as "MONTHLY" | "YEARLY",
      priceAmount: Number(sub.priceAmount),
      priceCurrency: sub.priceCurrency,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      activeEmployees,
      trialEndsAt: tenant.trialEndsAt,
    };
  }

  async listTransactions(tenantSlug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { subscription: { include: { transactions: { orderBy: { createdAt: "desc" } } } } },
    });
    return tenant?.subscription?.transactions ?? [];
  }

  async previewChange(tenantSlug: string, plan: PlanCode, period: "MONTHLY" | "YEARLY") {
    const activeEmployees = await this.countActiveEmployees();
    if (!planCanFit(plan, activeEmployees)) {
      throw new BadRequestException({
        code: "PLAN_TOO_SMALL",
        message: `Plan ${plan} supports up to ${String(PRICING_TABLE[plan].employeesLimit)} active employees`,
      });
    }
    const newPrice = calculatePrice(plan, activeEmployees, period);
    const current = await this.getCurrentSubscription(tenantSlug);
    return {
      current: { plan: current.plan, price: current.priceAmount, period: current.billingPeriod },
      next: { plan, price: newPrice, period },
      difference: newPrice - current.priceAmount,
      activeEmployees,
    };
  }

  async changePlan(
    tenantSlug: string,
    plan: PlanCode,
    period: "MONTHLY" | "YEARLY",
  ): Promise<CurrentSubscription> {
    const activeEmployees = await this.countActiveEmployees();
    if (!planCanFit(plan, activeEmployees)) {
      throw new BadRequestException({ code: "PLAN_TOO_SMALL" });
    }
    const price = calculatePrice(plan, activeEmployees, period);
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { subscription: true },
    });
    if (!tenant?.subscription) {
      throw new NotFoundException({ code: "SUBSCRIPTION_NOT_FOUND" });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (period === "MONTHLY") expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await prisma.subscription.update({
      where: { id: tenant.subscription.id },
      data: {
        plan,
        employeesLimit: PRICING_TABLE[plan].employeesLimit,
        modules: PRICING_TABLE[plan].modules,
        priceAmount: price,
        billingPeriod: period,
        startedAt: now,
        expiresAt,
      },
    });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE" },
    });
    return this.getCurrentSubscription(tenantSlug);
  }

  private async countActiveEmployees(): Promise<number> {
    const client = await this.tenantDb.getClient();
    const rows = await client.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM users WHERE status = 'ACTIVE'`,
    );
    return Number(rows[0]?.count ?? 0);
  }
}
