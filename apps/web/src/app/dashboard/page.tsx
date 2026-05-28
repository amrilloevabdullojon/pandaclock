import { LayoutDashboard, Users, Clock, AlertTriangle, Palmtree, RefreshCw } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
} from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";

interface DashboardCounts {
  totalEmployees: number;
  workingNow: number;
  lateToday: number;
  onLeave: number;
}

interface WorkingPerson {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: "WORKING" | "ON_BREAK";
  startedAt: string;
  departmentName: string | null;
}

export default async function DashboardPage() {
  const [counts, working] = await Promise.all([
    serverFetch<DashboardCounts>("/time/dashboard").catch(() => ({
      totalEmployees: 0,
      workingNow: 0,
      lateToday: 0,
      onLeave: 0,
    })),
    serverFetch<WorkingPerson[]>("/time/who-is-working").catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Обзор команды"
        description="Что происходит в компании прямо сейчас"
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Сотрудников"
          value={counts.totalEmployees}
          tone="primary"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="На работе сейчас"
          value={counts.workingNow}
          tone="success"
          hint={
            counts.totalEmployees > 0
              ? `${Math.round((counts.workingNow / counts.totalEmployees) * 100)}% команды`
              : undefined
          }
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Опоздали сегодня"
          value={counts.lateToday}
          tone="warning"
        />
        <KpiCard
          icon={<Palmtree className="h-5 w-5" />}
          label="В отпуске"
          value={counts.onLeave}
          tone="info"
        />
      </div>

      {/* Кто на работе сейчас */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-lg font-bold">Кто на работе сейчас</h2>
              <p className="text-muted-foreground text-xs">
                {working.length === 1
                  ? "1 человек"
                  : working.length < 5 && working.length > 0
                    ? `${working.length} человека`
                    : `${working.length} человек`}
              </p>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              Обновить
            </Button>
          </div>

          {working.length === 0 ? (
            <EmptyState
              icon={<Clock />}
              title="Пока никто не отметился"
              description="Сотрудники появятся здесь сразу после клик-ина в мобильном приложении"
            />
          ) : (
            <ul className="divide-border divide-y">
              {working.map((person) => (
                <li
                  key={person.userId}
                  className="hover:bg-muted/40 -mx-3 flex items-center gap-4 rounded-sm px-3 py-3 transition-colors"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary-100 text-primary-700 text-xs font-bold">
                      {person.firstName.charAt(0)}
                      {person.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate font-semibold">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {person.departmentName ?? "—"} · с{" "}
                      {new Date(person.startedAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant={person.status === "WORKING" ? "success" : "warning"} dot>
                    {person.status === "WORKING" ? "На работе" : "Перерыв"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

type Tone = "primary" | "success" | "warning" | "info" | "danger";

const TONE_STYLES: Record<Tone, { icon: string; value: string; bg: string }> = {
  primary: { icon: "text-primary-500", value: "text-foreground", bg: "bg-primary-50" },
  success: { icon: "text-success", value: "text-success", bg: "bg-success-light" },
  warning: { icon: "text-warning", value: "text-warning", bg: "bg-warning-light" },
  info: { icon: "text-info", value: "text-info", bg: "bg-info-light" },
  danger: { icon: "text-danger", value: "text-danger", bg: "bg-danger-light" },
};

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: Tone;
}) {
  const t = TONE_STYLES[tone];
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
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
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}
