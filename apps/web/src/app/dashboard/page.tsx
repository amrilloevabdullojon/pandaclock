import { AlertTriangle, Clock, LayoutDashboard, Palmtree, RefreshCw, Users } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  BarChart,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Sparkline,
  TrendIndicator,
  type ChartColor,
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

interface MetricTrend {
  sparkline: number[];
  current: number;
  trend: number;
}

interface DashboardTrends {
  workingPerDay: MetricTrend;
  latePerDay: MetricTrend;
  onLeavePerDay: MetricTrend;
}

export default async function DashboardPage() {
  const [counts, working, trends] = await Promise.all([
    serverFetch<DashboardCounts>("/time/dashboard").catch(() => ({
      totalEmployees: 0,
      workingNow: 0,
      lateToday: 0,
      onLeave: 0,
    })),
    serverFetch<WorkingPerson[]>("/time/who-is-working").catch(() => []),
    serverFetch<DashboardTrends>("/time/dashboard/trends?days=14").catch(
      () =>
        ({
          workingPerDay: { sparkline: [], current: 0, trend: 0 },
          latePerDay: { sparkline: [], current: 0, trend: 0 },
          onLeavePerDay: { sparkline: [], current: 0, trend: 0 },
        }) as DashboardTrends,
    ),
  ]);

  // BarChart по дням — для широкого виджета.
  const activityData =
    trends.workingPerDay.sparkline.length > 0
      ? trends.workingPerDay.sparkline.map((value, idx, arr) => {
          const d = new Date();
          d.setDate(d.getDate() - (arr.length - 1 - idx));
          return {
            day: d.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit" }),
            "На работе": value,
            Опоздания: trends.latePerDay.sparkline[idx] ?? 0,
          };
        })
      : [];

  return (
    <>
      <PageHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Обзор команды"
        description="Что происходит в компании прямо сейчас"
      />

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
          sparkline={trends.workingPerDay.sparkline}
          trend={trends.workingPerDay.trend}
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
          sparkline={trends.latePerDay.sparkline}
          trend={trends.latePerDay.trend}
          inverseTrend
        />
        <KpiCard
          icon={<Palmtree className="h-5 w-5" />}
          label="В отпуске"
          value={counts.onLeave}
          tone="info"
          sparkline={trends.onLeavePerDay.sparkline}
          trend={trends.onLeavePerDay.trend}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Активность за 14 дней */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-foreground text-lg font-bold">Активность команды</h2>
                <p className="text-muted-foreground text-xs">За последние 14 дней</p>
              </div>
            </div>
            {activityData.length === 0 ? (
              <EmptyState
                compact
                icon={<Clock />}
                title="Нет данных за период"
                description="Сотрудники появятся здесь после первых отметок"
              />
            ) : (
              <BarChart
                data={activityData}
                xKey="day"
                bars={[
                  { key: "На работе", color: "success" },
                  { key: "Опоздания", color: "warning" },
                ]}
                height={220}
              />
            )}
          </CardContent>
        </Card>

        {/* Кто на работе сейчас */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-foreground text-lg font-bold">На работе</h2>
                <p className="text-muted-foreground text-xs">
                  {working.length === 1
                    ? "1 человек"
                    : working.length < 5 && working.length > 0
                      ? `${working.length} человека`
                      : `${working.length} человек`}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Обновить">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {working.length === 0 ? (
              <EmptyState
                compact
                icon={<Clock />}
                title="Никто не отметился"
                description="Появятся после клик-ина"
              />
            ) : (
              <ul className="-mx-2 space-y-1">
                {working.slice(0, 8).map((person) => (
                  <li
                    key={person.userId}
                    className="hover:bg-muted/40 flex items-center gap-2 rounded-sm px-2 py-1.5 transition-colors"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-gradient-primary text-[10px] font-bold text-white">
                        {person.firstName.charAt(0)}
                        {person.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {person.firstName} {person.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">
                        с{" "}
                        {new Date(person.startedAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={person.status === "WORKING" ? "success" : "warning"}
                      dot
                      className="shrink-0"
                    >
                      {person.status === "WORKING" ? "Работает" : "Перерыв"}
                    </Badge>
                  </li>
                ))}
                {working.length > 8 && (
                  <li className="text-muted-foreground px-2 pt-2 text-center text-xs">
                    Ещё {working.length - 8}…
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

type Tone = "primary" | "success" | "warning" | "info" | "danger";

const TONE_STYLES: Record<Tone, { icon: string; value: string; bg: string; chart: ChartColor }> = {
  primary: {
    icon: "text-primary-500",
    value: "text-foreground",
    bg: "bg-primary-50",
    chart: "primary",
  },
  success: {
    icon: "text-success",
    value: "text-success",
    bg: "bg-success-light",
    chart: "success",
  },
  warning: {
    icon: "text-warning",
    value: "text-warning",
    bg: "bg-warning-light",
    chart: "warning",
  },
  info: { icon: "text-info", value: "text-info", bg: "bg-info-light", chart: "info" },
  danger: { icon: "text-danger", value: "text-danger", bg: "bg-danger-light", chart: "danger" },
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: Tone;
  sparkline?: number[];
  trend?: number;
  inverseTrend?: boolean;
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "primary",
  sparkline,
  trend,
  inverseTrend,
}: KpiCardProps) {
  const t = TONE_STYLES[tone];
  const sparkData = sparkline?.map((v) => ({ value: v })) ?? [];
  const hasSpark = sparkData.length > 1;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {label}
          </p>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${t.bg} ${t.icon}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>

        <div>
          <p className={`text-3xl font-extrabold tabular-nums ${t.value}`}>{value}</p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend !== undefined && trend !== 0 && (
              <TrendIndicator value={trend} inverse={inverseTrend} />
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        </div>

        {hasSpark && <Sparkline data={sparkData} color={t.chart} height={32} />}
      </CardContent>
    </Card>
  );
}
