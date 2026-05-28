import { CreditCard } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../../_components/page-breadcrumbs";
import { ChangePlanButton } from "./_components/change-plan-button";

type PlanCode = "STARTER" | "BUSINESS" | "PRO" | "ENTERPRISE";

interface PlanDefinition {
  code: PlanCode;
  name: string;
  baseMonthly: number;
  perEmployeeMonthly: number;
  employeesLimit: number;
  modules: string[];
}

interface Subscription {
  plan: PlanCode;
  planName: string;
  modules: string[];
  employeesLimit: number;
  billingPeriod: "MONTHLY" | "YEARLY";
  priceAmount: number;
  priceCurrency: string;
  startedAt: string;
  expiresAt: string;
  activeEmployees: number;
  trialEndsAt: string | null;
}

interface Transaction {
  id: string;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
}

export default async function BillingPage() {
  const [subscription, transactions, plans] = await Promise.all([
    serverFetch<Subscription>("/billing/subscription").catch(() => null),
    serverFetch<Transaction[]>("/billing/transactions").catch(() => []),
    serverFetch<Record<PlanCode, PlanDefinition>>("/billing/plans").catch(() => null),
  ]);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<CreditCard className="h-6 w-6" />}
        title="Биллинг"
        description="Тариф, способ оплаты и история платежей"
      />

      {subscription ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Текущий тариф
                </p>
                <p className="mt-1 text-2xl font-extrabold text-neutral-900">
                  ⭐ {subscription.planName}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {subscription.activeEmployees} активных сотрудников
                  {subscription.employeesLimit > 0
                    ? ` · лимит ${String(subscription.employeesLimit)}`
                    : " · без лимита"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary-500 text-3xl font-extrabold">
                  {formatPrice(subscription.priceAmount, subscription.priceCurrency)}
                </p>
                <p className="text-xs text-neutral-500">
                  / {subscription.billingPeriod === "MONTHLY" ? "месяц" : "год"}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4 text-sm">
              <Row label="Начало периода">
                {new Date(subscription.startedAt).toLocaleDateString("ru-RU")}
              </Row>
              <Row label="Следующее списание">
                {new Date(subscription.expiresAt).toLocaleDateString("ru-RU")}
              </Row>
              {subscription.trialEndsAt ? (
                <Row label="Триал до">
                  {new Date(subscription.trialEndsAt).toLocaleDateString("ru-RU")}
                </Row>
              ) : null}
              <Row label="Модули">
                <div className="flex flex-wrap gap-1">
                  {subscription.modules.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </Row>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {plans && subscription ? (
        <section>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">Сменить тариф</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {(Object.values(plans) as PlanDefinition[]).map((plan) => (
              <Card
                key={plan.code}
                className={plan.code === subscription.plan ? "ring-primary-500 ring-2" : ""}
              >
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                    {plan.name}
                  </p>
                  <p className="text-2xl font-extrabold text-neutral-900">
                    {plan.baseMonthly > 0
                      ? `${plan.baseMonthly.toLocaleString("ru-RU")} +${plan.perEmployeeMonthly.toLocaleString("ru-RU")}/сотр.`
                      : plan.perEmployeeMonthly > 0
                        ? `${plan.perEmployeeMonthly.toLocaleString("ru-RU")} UZS / сотр.`
                        : "Бесплатно"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {plan.employeesLimit > 0
                      ? `до ${String(plan.employeesLimit)} сотрудников`
                      : "без лимита"}
                  </p>
                  {plan.code === subscription.plan ? (
                    <Badge variant="success">Текущий</Badge>
                  ) : (
                    <ChangePlanButton plan={plan.code} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900">История платежей</h2>
        <Card>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  compact
                  icon={<CreditCard />}
                  title="Транзакций пока нет"
                  description="История платежей появится после первого списания"
                />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-6 py-3">Дата</th>
                    <th className="px-6 py-3">Сумма</th>
                    <th className="px-6 py-3">Провайдер</th>
                    <th className="px-6 py-3">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-3 text-neutral-900">
                        {new Date(tx.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-6 py-3 font-semibold text-neutral-900">
                        {Number(tx.amount).toLocaleString("ru-RU")} {tx.currency}
                      </td>
                      <td className="px-6 py-3 text-neutral-600">{tx.provider}</td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            tx.status === "SUCCEEDED"
                              ? "success"
                              : tx.status === "FAILED"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="mt-1 font-semibold text-neutral-900">{children}</dd>
    </div>
  );
}

function formatPrice(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}
