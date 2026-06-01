import { Calendar, FileText, Palmtree, ThermometerSun, Wallet } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { CreateRequestButton } from "./_components/create-request";
import { RequestsList } from "./_components/requests-list";
import { RequestsTabs } from "./_components/requests-tabs";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type LeaveType = "VACATION" | "SICK" | "TIME_OFF" | "OTHER";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: Status;
  approverName: string | null;
  approverComment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface Balance {
  used: number;
  accrued: number;
  pending: number;
  remaining: number;
}

const SCOPES = ["my", "team", "all"] as const;
type Scope = (typeof SCOPES)[number];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: Status }>;
}) {
  const { scope: scopeParam, status: statusFilter } = await searchParams;
  const scope: Scope = SCOPES.includes(scopeParam as Scope) ? (scopeParam as Scope) : "my";

  const [items, balance] = await Promise.all([
    serverFetch<LeaveRequest[]>(`/requests?scope=${scope}`).catch(() => []),
    serverFetch<Balance>("/requests/balance").catch(() => null),
  ]);

  const counts = {
    all: items.length,
    pending: items.filter((r) => r.status === "PENDING").length,
    approved: items.filter((r) => r.status === "APPROVED").length,
    rejected: items.filter((r) => r.status === "REJECTED").length,
  };
  const filtered = statusFilter ? items.filter((r) => r.status === statusFilter) : items;

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<FileText className="h-6 w-6" />}
        title="Заявки"
        description="Отпуска, больничные и отгулы"
        actions={<CreateRequestButton balance={balance} />}
      />

      {balance ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard
            icon={<Wallet className="h-5 w-5" />}
            label="Накоплено дней"
            value={balance.accrued}
            tone="primary"
          />
          <BalanceCard
            icon={<Palmtree className="h-5 w-5" />}
            label="Использовано"
            value={balance.used}
            tone="info"
          />
          <BalanceCard
            icon={<ThermometerSun className="h-5 w-5" />}
            label="Ждут утверждения"
            value={balance.pending}
            tone="warning"
          />
          <BalanceCard
            icon={<Calendar className="h-5 w-5" />}
            label="Остаток"
            value={balance.remaining}
            tone="success"
          />
        </div>
      ) : null}

      <RequestsTabs scope={scope} status={statusFilter} counts={counts} />

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FileText />}
                title={statusFilter ? "Нет заявок с таким статусом" : "Пока нет заявок"}
                description={
                  statusFilter
                    ? "Снимите фильтр статуса или попробуйте другую вкладку"
                    : "Создайте первую заявку на отпуск — кнопка справа сверху"
                }
              />
            </div>
          ) : (
            <RequestsList items={filtered} scope={scope} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

type Tone = "primary" | "success" | "warning" | "info";

const TONE_STYLES: Record<Tone, { icon: string; value: string; bg: string }> = {
  primary: { icon: "text-primary-500", value: "text-foreground", bg: "bg-primary-50" },
  success: { icon: "text-success", value: "text-success", bg: "bg-success-light" },
  warning: { icon: "text-warning", value: "text-warning", bg: "bg-warning-light" },
  info: { icon: "text-info", value: "text-info", bg: "bg-info-light" },
};

function BalanceCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: Tone;
}) {
  const t = TONE_STYLES[tone];
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {label}
          </p>
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-sm ${t.bg} ${t.icon}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
        <p className={`mt-3 text-3xl font-extrabold tabular-nums ${t.value}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
