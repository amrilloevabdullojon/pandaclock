import Link from "next/link";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Card,
  CardContent,
  DonutChart,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type ChartColor,
} from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { ReportControls } from "./_components/report-controls";

type ReportType = "overview" | "attendance" | "hours" | "tasks";

interface OverviewPayload {
  period: { startIso: string; endIso: string };
  daily: { date: string; present: number; late: number; onLeave: number }[];
  byDepartment: { department: string; totalHours: number; lateRate: number; headcount: number }[];
  leaveByType: { type: string; days: number; count: number }[];
  summary: { totalHours: number; avgPresentPerDay: number; lateRate: number; leaveDays: number };
}

interface AttendanceRow {
  userId: string;
  fullName: string;
  email: string;
  departmentName: string | null;
  daysWorked: number;
  lateCount: number;
  totalMinutes: number;
}

interface HoursRow {
  userId: string;
  fullName: string;
  totalMinutes: number;
  averageMinutes: number;
  daysCount: number;
}

interface TasksRow {
  userId: string;
  fullName: string;
  assigned: number;
  completed: number;
  completionRate: number;
  overdue: number;
}

const REPORT_TYPES: { id: ReportType; title: string; description: string }[] = [
  {
    id: "overview",
    title: "📈 Аналитика",
    description: "Тренды по дням, отделам и отпускам за период",
  },
  {
    id: "attendance",
    title: "⏱️ Посещаемость",
    description: "Дни на работе, опоздания, часы по сотруднику",
  },
  {
    id: "hours",
    title: "📊 Отработанные часы",
    description: "Всего часов и среднее за день",
  },
  {
    id: "tasks",
    title: "✅ Задачи и KPI",
    description: "Процент выполнения и просроченные",
  },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: ReportType; start?: string; end?: string }>;
}) {
  const { type, start, end } = await searchParams;
  const selected = REPORT_TYPES.find((r) => r.id === type) ?? null;

  const qs = new URLSearchParams();
  if (start) qs.set("start", start);
  if (end) qs.set("end", end);

  const suffix = qs.size ? `?${qs.toString()}` : "";

  type ReportPayload = {
    period: { startIso: string; endIso: string };
    rows: AttendanceRow[] | HoursRow[] | TasksRow[];
  };
  let report: ReportPayload | null = null;
  let overview: OverviewPayload | null = null;
  if (selected?.id === "overview") {
    overview = await serverFetch<OverviewPayload>(`/reports/overview${suffix}`).catch(() => null);
  } else if (selected) {
    report = await serverFetch<ReportPayload>(`/reports/${selected.id}${suffix}`).catch(() => null);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<BarChart3 className="h-6 w-6" />}
        title="Отчёты"
        description="Аналитика команды с выгрузкой в Excel или PDF"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {REPORT_TYPES.map((rt) => (
          <Link key={rt.id} href={{ pathname: "/dashboard/reports", query: { type: rt.id } }}>
            <Card
              className={selected?.id === rt.id ? "ring-primary-500 ring-2" : "hover:shadow-md"}
            >
              <CardContent className="p-6">
                <p className="text-foreground text-lg font-bold">{rt.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{rt.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {selected?.id === "overview" && overview ? (
        <>
          <ReportControls type="overview" period={overview.period} exportable={false} />
          <OverviewPanel data={overview} />
        </>
      ) : null}

      {selected && selected.id !== "overview" && report ? (
        <>
          <ReportControls type={selected.id} period={report.period} />
          {report.rows.length > 0 && <ReportChart type={selected.id} rows={report.rows} />}
          <Card>
            <CardContent className="p-0">
              {report.rows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<BarChart3 />}
                    title="Нет данных за период"
                    description="Попробуйте выбрать другой диапазон дат или дождитесь активности команды"
                  />
                </div>
              ) : (
                <ReportTable type={selected.id} rows={report.rows} />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  );
}

function ReportChart({
  type,
  rows,
}: {
  type: Exclude<ReportType, "overview">;
  rows: AttendanceRow[] | HoursRow[] | TasksRow[];
}) {
  if (type === "attendance") {
    const data = (rows as AttendanceRow[]).slice(0, 12).map((r) => ({
      name: shortName(r.fullName),
      Часов: Math.round((r.totalMinutes / 60) * 10) / 10,
      Опозданий: r.lateCount,
    }));
    return (
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-foreground text-base font-bold">
                Топ-{data.length} по часам и опозданиям
              </h3>
              <p className="text-muted-foreground text-xs">Часы работы и опоздания за период</p>
            </div>
          </div>
          <BarChart
            data={data}
            xKey="name"
            bars={[
              { key: "Часов", color: "primary" },
              { key: "Опозданий", color: "warning" },
            ]}
            height={260}
          />
        </CardContent>
      </Card>
    );
  }

  if (type === "hours") {
    const data = (rows as HoursRow[]).slice(0, 12).map((r) => ({
      name: shortName(r.fullName),
      Всего: Math.round((r.totalMinutes / 60) * 10) / 10,
      Среднее: Math.round((r.averageMinutes / 60) * 10) / 10,
    }));
    return (
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-foreground text-base font-bold">Часы по сотрудникам</h3>
              <p className="text-muted-foreground text-xs">Всего и среднее за день</p>
            </div>
          </div>
          <BarChart
            data={data}
            xKey="name"
            bars={[
              { key: "Всего", color: "primary" },
              { key: "Среднее", color: "info" },
            ]}
            height={260}
          />
        </CardContent>
      </Card>
    );
  }

  // Tasks: donut по выполнено / в работе / просрочено + BarChart completion-rate
  const tasksRows = rows as TasksRow[];
  const totals = tasksRows.reduce(
    (acc, r) => {
      acc.completed += r.completed;
      acc.assigned += r.assigned;
      acc.overdue += r.overdue;
      return acc;
    },
    { completed: 0, assigned: 0, overdue: 0 },
  );
  const inProgress = Math.max(0, totals.assigned - totals.completed - totals.overdue);
  const donutData = [
    { name: "Выполнено", value: totals.completed, color: "success" as const },
    { name: "В работе", value: inProgress, color: "info" as const },
    { name: "Просрочено", value: totals.overdue, color: "danger" as const },
  ];
  const barData = tasksRows
    .slice(0, 10)
    .map((r) => ({ name: shortName(r.fullName), "% выполнения": r.completionRate }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-foreground mb-2 text-base font-bold">Структура задач</h3>
          <p className="text-muted-foreground mb-4 text-xs">
            {totals.completed} из {totals.assigned} выполнено
          </p>
          <DonutChart
            data={donutData}
            centerLabel={{
              value:
                totals.assigned > 0
                  ? `${Math.round((totals.completed / totals.assigned) * 100)}%`
                  : "—",
              description: "выполнено",
            }}
            height={220}
          />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <h3 className="text-foreground mb-2 text-base font-bold">% выполнения по сотрудникам</h3>
          <p className="text-muted-foreground mb-4 text-xs">Топ-{barData.length}</p>
          <BarChart
            data={barData}
            xKey="name"
            bars={[{ key: "% выполнения", color: "primary" }]}
            horizontal
            height={Math.max(220, barData.length * 30)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[1]?.charAt(0) ?? ""}.`;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  VACATION: "Отпуск",
  SICK: "Больничный",
  TIME_OFF: "Отгул",
  OTHER: "Другое",
};

const LEAVE_TYPE_COLORS: Record<string, ChartColor> = {
  VACATION: "info",
  SICK: "danger",
  TIME_OFF: "warning",
  OTHER: "muted",
};

function OverviewPanel({ data }: { data: OverviewPayload }) {
  const hasData =
    data.daily.some((d) => d.present > 0 || d.late > 0 || d.onLeave > 0) ||
    data.byDepartment.some((d) => d.totalHours > 0) ||
    data.leaveByType.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<BarChart3 />}
            title="Нет данных за период"
            description="Выберите другой диапазон дат или дождитесь активности команды"
          />
        </CardContent>
      </Card>
    );
  }

  // Дневной ряд — формат подписи оси X. При длинном периоде прореживаем тики.
  const dailyData = data.daily.map((d) => ({
    day: formatDayShort(d.date),
    "На работе": d.present,
    Опоздания: d.late,
    "В отпуске": d.onLeave,
  }));

  const deptData = data.byDepartment
    .filter((d) => d.totalHours > 0 || d.headcount > 0)
    .slice(0, 12)
    .map((d) => ({
      name: d.department,
      Часов: d.totalHours,
    }));

  const leaveData = data.leaveByType.map((l) => ({
    name: LEAVE_TYPE_LABELS[l.type] ?? l.type,
    value: l.days,
    color: LEAVE_TYPE_COLORS[l.type] ?? ("muted" as ChartColor),
  }));

  return (
    <div className="space-y-4">
      {/* KPI-полоса */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewKpi label="Часов всего" value={data.summary.totalHours} tone="primary" />
        <OverviewKpi
          label="В среднем на работе/день"
          value={data.summary.avgPresentPerDay}
          tone="success"
        />
        <OverviewKpi label="Доля опозданий" value={`${data.summary.lateRate}%`} tone="warning" />
        <OverviewKpi label="Дней отпусков" value={data.summary.leaveDays} tone="info" />
      </div>

      {/* Тренд по дням */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-foreground text-base font-bold">Динамика по дням</h3>
            <p className="text-muted-foreground text-xs">Выходы, опоздания и отпуска за период</p>
          </div>
          <BarChart
            data={dailyData}
            xKey="day"
            bars={[
              { key: "На работе", color: "success" },
              { key: "Опоздания", color: "warning" },
              { key: "В отпуске", color: "info" },
            ]}
            height={280}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Часы по отделам */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-foreground mb-1 text-base font-bold">Часы по отделам</h3>
            <p className="text-muted-foreground mb-4 text-xs">Сумма отработанных часов за период</p>
            {deptData.length > 0 ? (
              <BarChart
                data={deptData}
                xKey="name"
                bars={[{ key: "Часов", color: "primary" }]}
                horizontal
                height={Math.max(200, deptData.length * 34)}
              />
            ) : (
              <EmptyState compact icon={<BarChart3 />} title="Нет отработанных часов" />
            )}
          </CardContent>
        </Card>

        {/* Отпуска по типам */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-foreground mb-1 text-base font-bold">Отпуска по типам</h3>
            <p className="text-muted-foreground mb-4 text-xs">Дней по одобренным заявкам</p>
            {leaveData.length > 0 ? (
              <DonutChart
                data={leaveData}
                centerLabel={{ value: data.summary.leaveDays, description: "дней" }}
                height={220}
              />
            ) : (
              <EmptyState compact icon={<BarChart3 />} title="Нет отпусков за период" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const OVERVIEW_TONE: Record<string, { value: string; bg: string }> = {
  primary: { value: "text-foreground", bg: "bg-primary-50" },
  success: { value: "text-success", bg: "bg-success-light" },
  warning: { value: "text-warning", bg: "bg-warning-light" },
  info: { value: "text-info", bg: "bg-info-light" },
};

function OverviewKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const t = OVERVIEW_TONE[tone]!;
  return (
    <Card className={t.bg}>
      <CardContent className="p-5">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {label}
        </p>
        <p className={`mt-2 text-3xl font-extrabold tabular-nums ${t.value}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/** 'YYYY-MM-DD' → 'дд.мм' для оси X. */
function formatDayShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function ReportTable({
  type,
  rows,
}: {
  type: Exclude<ReportType, "overview">;
  rows: AttendanceRow[] | HoursRow[] | TasksRow[];
}) {
  if (type === "attendance") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Сотрудник</TableHead>
            <TableHead>Отдел</TableHead>
            <TableHead className="text-right">Дней</TableHead>
            <TableHead className="text-right">Опозданий</TableHead>
            <TableHead className="text-right">Часов</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows as AttendanceRow[]).map((row) => (
            <TableRow key={row.userId}>
              <TableCell className="text-foreground font-semibold">{row.fullName}</TableCell>
              <TableCell className="text-muted-foreground">{row.departmentName ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{row.daysWorked}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.lateCount > 0 ? (
                  <span className="text-warning font-semibold">{row.lateCount}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {Math.round((row.totalMinutes / 60) * 10) / 10}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (type === "hours") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Сотрудник</TableHead>
            <TableHead className="text-right">Дней</TableHead>
            <TableHead className="text-right">Всего часов</TableHead>
            <TableHead className="text-right">Среднее</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows as HoursRow[]).map((row) => (
            <TableRow key={row.userId}>
              <TableCell className="text-foreground font-semibold">{row.fullName}</TableCell>
              <TableCell className="text-right tabular-nums">{row.daysCount}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {Math.round((row.totalMinutes / 60) * 10) / 10}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {Math.round((row.averageMinutes / 60) * 10) / 10}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Сотрудник</TableHead>
          <TableHead className="text-right">Назначено</TableHead>
          <TableHead className="text-right">Выполнено</TableHead>
          <TableHead className="text-right">% выполн.</TableHead>
          <TableHead className="text-right">Просрочено</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(rows as TasksRow[]).map((row) => (
          <TableRow key={row.userId}>
            <TableCell className="text-foreground font-semibold">{row.fullName}</TableCell>
            <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
            <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
            <TableCell className="text-right">
              <span
                className={`font-semibold tabular-nums ${
                  row.completionRate >= 80
                    ? "text-success"
                    : row.completionRate >= 50
                      ? "text-warning"
                      : "text-destructive"
                }`}
              >
                {row.completionRate}%
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.overdue > 0 ? (
                <span className="text-destructive font-semibold">{row.overdue}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
