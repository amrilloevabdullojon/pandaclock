import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { CreateRequestButton } from "./_components/create-request";
import { DecisionButtons } from "./_components/decision-buttons";

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

const SCOPES = [
  { id: "my", label: "Мои" },
  { id: "team", label: "Команда" },
  { id: "all", label: "Все" },
] as const;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: Status }>;
}) {
  const { scope: scopeParam, status: statusFilter } = await searchParams;
  const scope = (SCOPES.find((s) => s.id === scopeParam)?.id ?? "my") as "my" | "team" | "all";

  const [items, balance] = await Promise.all([
    serverFetch<LeaveRequest[]>(`/requests?scope=${scope}`).catch(() => []),
    serverFetch<Balance>("/requests/balance").catch(() => null),
  ]);

  const filtered = statusFilter ? items.filter((r) => r.status === statusFilter) : items;

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<FileText className="h-6 w-6" />}
        title="Заявки"
        description="Отпуска, больничные, отгулы"
        actions={<CreateRequestButton balance={balance} />}
      />

      {balance ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Накоплено дней" value={balance.accrued} />
          <Stat label="Использовано" value={balance.used} />
          <Stat label="Ждут утверждения" value={balance.pending} accent="warning" />
          <Stat label="Остаток" value={balance.remaining} accent="success" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/requests?scope=${s.id}`}
            className={[
              "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors",
              scope === s.id
                ? "bg-primary-500 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
            ].join(" ")}
          >
            {s.label}
          </Link>
        ))}

        <div className="ml-auto flex gap-2 text-sm">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <Link
              key={status}
              href={{
                pathname: "/dashboard/requests",
                query: { scope, status: statusFilter === status ? undefined : status },
              }}
              className={[
                "rounded-pill px-3 py-1 text-xs font-semibold",
                statusFilter === status
                  ? "bg-primary-100 text-primary-700"
                  : "text-neutral-500 hover:text-neutral-900",
              ].join(" ")}
            >
              {statusLabel(status)}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FileText />}
                title="Нет заявок"
                description="В выбранном фильтре ничего не найдено. Попробуйте сменить фильтр или создать новую заявку."
              />
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {filtered.map((req) => (
                <li key={req.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        {typeIcon(req.type)} {typeLabel(req.type)} · {req.userName}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {req.startDate} — {req.endDate} ({req.daysCount} раб. дней)
                      </p>
                      {req.reason ? (
                        <p className="mt-2 text-sm text-neutral-600">{req.reason}</p>
                      ) : null}
                      {req.approverComment ? (
                        <p className="mt-1 text-xs italic text-neutral-500">
                          {req.approverName}: {req.approverComment}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={req.status} />
                      {req.status === "PENDING" && (scope === "team" || scope === "all") ? (
                        <DecisionButtons requestId={req.id} />
                      ) : null}
                    </div>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "warning";
}) {
  const colorClass =
    accent === "success"
      ? "text-success"
      : accent === "warning"
        ? "text-warning"
        : "text-neutral-900";
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <p className={`mt-2 text-3xl font-extrabold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">Ждёт решения</Badge>;
    case "APPROVED":
      return <Badge variant="success">Утверждена</Badge>;
    case "REJECTED":
      return <Badge variant="danger">Отклонена</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Отменена</Badge>;
  }
}

function statusLabel(status: Status): string {
  return status === "PENDING" ? "Ждут" : status === "APPROVED" ? "Утв." : "Откл.";
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
