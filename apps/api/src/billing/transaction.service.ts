import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { prisma, type Prisma } from "@pandaclock/db";

/**
 * Регистрирует успешный платёж в public.billing_transactions
 * и продлевает subscription.expiresAt.
 *
 * merchant_trans_id формат: "{tenantId}:{plan}:{period}".
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  async recordSuccess(input: {
    merchantTransId: string;
    amount: number;
    currency: string;
    provider: "CLICK" | "PAYME" | "UZCARD" | "HUMO" | "STRIPE" | "BANK_TRANSFER";
    providerTxId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const parsed = this.parseMerchantTransId(input.merchantTransId);
    if (!parsed) {
      this.logger.warn({ id: input.merchantTransId }, "cannot parse merchant_trans_id");
      return;
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: parsed.tenantId },
      include: { subscription: true },
    });
    if (!tenant?.subscription) throw new NotFoundException({ code: "SUBSCRIPTION_NOT_FOUND" });

    await prisma.$transaction(async (tx) => {
      await tx.billingTransaction.create({
        data: {
          subscriptionId: tenant.subscription!.id,
          amount: input.amount,
          currency: input.currency,
          provider: input.provider,
          providerTxId: input.providerTxId,
          status: "SUCCEEDED",
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      const now = new Date();
      const newExpiresAt = new Date(
        Math.max(tenant.subscription!.expiresAt.getTime(), now.getTime()),
      );
      if (parsed.period === "MONTHLY") {
        newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
      } else {
        newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
      }
      await tx.subscription.update({
        where: { id: tenant.subscription!.id },
        data: { expiresAt: newExpiresAt },
      });
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { status: "ACTIVE", trialEndsAt: null },
      });
    });
  }

  parseMerchantTransId(
    id: string,
  ): { tenantId: string; plan: string; period: "MONTHLY" | "YEARLY" } | null {
    const parts = id.split(":");
    if (parts.length !== 3) return null;
    const [tenantId, plan, period] = parts;
    if (!tenantId || !plan || (period !== "MONTHLY" && period !== "YEARLY")) return null;
    return { tenantId, plan, period };
  }
}
