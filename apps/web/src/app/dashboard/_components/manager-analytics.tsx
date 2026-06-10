import Link from "next/link";
import { Briefcase, ClipboardCheck, ClipboardList, Smile, Wallet } from "lucide-react";
import { Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";

interface ManagementOverview {
  recruitment: { openVacancies: number; totalCandidates: number; hiredThisMonth: number };
  approvals: { pendingTrips: number; pendingExpenses: number };
  enps: { score: number | null; responses: number };
  payroll: { lastPeriod: string | null; fund: number };
  surveys: { active: number };
}

function compactMoney(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс`;
  return String(Math.round(n));
}

/**
 * Сводка по компании для руководителей. Эндпоинт отдаёт 403 для остальных
 * ролей — тогда `serverFetch` бросает и виджет просто не рендерится.
 */
export async function ManagerAnalytics() {
  const data = await serverFetch<ManagementOverview>("/analytics/overview").catch(() => null);
  if (!data) return null;

  const pending = data.approvals.pendingTrips + data.approvals.pendingExpenses;

  return (
    <div>
      <h2 className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
        Сводка по компании
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiLink
          href="/dashboard/recruitment"
          icon={<Briefcase className="h-5 w-5" />}
          tone="primary"
          value={String(data.recruitment.openVacancies)}
          label="Открытых вакансий"
          hint={`${data.recruitment.totalCandidates} кандидатов`}
        />
        <KpiLink
          href="/dashboard/approvals"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone={pending > 0 ? "warning" : "success"}
          value={String(pending)}
          label="На согласовании"
          hint={`${data.approvals.pendingTrips} команд. · ${data.approvals.pendingExpenses} расх.`}
        />
        <KpiLink
          href="/dashboard/surveys"
          icon={<Smile className="h-5 w-5" />}
          tone="info"
          value={
            data.enps.score === null ? "—" : `${data.enps.score > 0 ? "+" : ""}${data.enps.score}`
          }
          label="eNPS"
          hint={data.enps.responses > 0 ? `${data.enps.responses} ответов` : "нет данных"}
        />
        <KpiLink
          href="/dashboard/payroll"
          icon={<Wallet className="h-5 w-5" />}
          tone="success"
          value={data.payroll.fund > 0 ? compactMoney(data.payroll.fund) : "—"}
          label="Фонд ЗП"
          hint={data.payroll.lastPeriod ?? "нет ведомостей"}
        />
        <KpiLink
          href="/dashboard/surveys"
          icon={<ClipboardList className="h-5 w-5" />}
          tone="primary"
          value={String(data.surveys.active)}
          label="Активных опросов"
        />
      </div>
    </div>
  );
}

const TONE: Record<"primary" | "success" | "warning" | "info", { icon: string; bg: string }> = {
  primary: { icon: "text-primary-500", bg: "bg-primary-50" },
  success: { icon: "text-success", bg: "bg-success-light" },
  warning: { icon: "text-warning", bg: "bg-warning-light" },
  info: { icon: "text-info", bg: "bg-info-light" },
};

function KpiLink({
  href,
  icon,
  tone,
  value,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "info";
  value: string;
  label: string;
  hint?: string;
}) {
  const t = TONE[tone];
  return (
    <Link href={href}>
      <Card className="hover:border-primary h-full transition-colors">
        <CardContent className="p-4">
          <div
            className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.bg} ${t.icon}`}
          >
            {icon}
          </div>
          <p className="text-foreground text-2xl font-extrabold">{value}</p>
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          {hint ? <p className="text-muted-foreground mt-0.5 text-[11px]">{hint}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
