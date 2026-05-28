import { Calendar, FileText, Palmtree, ThermometerSun, Wallet } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
} from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { CreateRequestButton } from "./_components/create-request";
import { DecisionButtons } from "./_components/decision-buttons";
import { RequestsTabs } from "./_components/requests-tabs";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type LeaveType = "VACATION" | "SICK" | "TIME_OFF" | "OTHER";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
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
            <ul className="divide-border divide-y">
              {filtered.map((req) => (
                <li
                  key={req.id}
                  className="hover:bg-muted/40 flex items-start justify-between gap-4 px-6 py-4 transition-colors"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <Avatar className="mt-0.5 h-9 w-9">
                      <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                        {initialsOf(req.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground text-sm font-bold">{req.userName}</span>
                        <Badge variant="outline" className="gap-1">
                          <span aria-hidden="true">{typeIcon(req.type)}</span>
                          {typeLabel(req.type)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(req.startDate)} — {formatDate(req.endDate)} ·{" "}
                        <span className="text-foreground font-semibold">{req.daysCount}</span> раб.{" "}
                        {pluralizeDays(req.daysCount)}
                      </p>
                      {req.reason && (
                        <p className="text-muted-foreground text-sm leading-snug">{req.reason}</p>
                      )}
                      {req.approverComment && (
                        <p className="text-muted-foreground text-xs italic">
                          <span className="font-semibold not-italic">{req.approverName}:</span>{" "}
                          {req.approverComment}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={req.status} />
                    {req.status === "PENDING" && (scope === "team" || scope === "all") ? (
                      <DecisionButtons requestId={req.id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
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

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="warning" dot>
          Ждёт решения
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="success" dot>
          Утверждена
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="danger" dot>
          Отклонена
        </Badge>
      );
    case "CANCELLED":
      return <Badge variant="secondary">Отменена</Badge>;
  }
}

function typeLabel(type: LeaveType): string {
  return type === "VACATION"
    ? "Отпуск"
    : type === "SICK"
      ? "Больничный"
      : type === "TIME_OFF"
        ? "Отгул"
        : "Другое";
}

function typeIcon(type: LeaveType): string {
  return type === "VACATION" ? "✈️" : type === "SICK" ? "🤒" : type === "TIME_OFF" ? "🎂" : "📝";
}

function pluralizeDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "день";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "дня";
  return "дней";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "?";
  const last = parts[parts.length - 1]?.charAt(0) ?? "";
  return (first + last).toUpperCase();
}

function formatDate(iso: string): string {
  // Ожидаем "YYYY-MM-DD". Отдаём "31 мая".
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
