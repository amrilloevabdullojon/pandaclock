import Link from "next/link";
import { Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { ReportControls } from "./_components/report-controls";

type ReportType = "attendance" | "hours" | "tasks";

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

  type ReportPayload = {
    period: { startIso: string; endIso: string };
    rows: AttendanceRow[] | HoursRow[] | TasksRow[];
  };
  let report: ReportPayload | null = null;
  if (selected) {
    report = await serverFetch<ReportPayload>(
      `/reports/${selected.id}${qs.size ? `?${qs.toString()}` : ""}`,
    ).catch(() => null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-neutral-900">Отчёты</h1>
        <p className="text-sm text-neutral-500">Выгрузка в Excel или PDF</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {REPORT_TYPES.map((rt) => (
          <Link key={rt.id} href={{ pathname: "/dashboard/reports", query: { type: rt.id } }}>
            <Card
              className={
                selected?.id === rt.id ? "ring-2 ring-primary-500" : "hover:shadow-md"
              }
            >
              <CardContent className="p-6">
                <p className="text-lg font-bold text-neutral-900">{rt.title}</p>
                <p className="mt-1 text-sm text-neutral-500">{rt.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {selected && report ? (
        <>
          <ReportControls type={selected.id} period={report.period} />
          <Card>
            <CardContent className="p-0">
              {report.rows.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-neutral-500">
                  Нет данных за выбранный период.
                </p>
              ) : (
                <ReportTable type={selected.id} rows={report.rows} />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function ReportTable({
  type,
  rows,
}: {
  type: ReportType;
  rows: AttendanceRow[] | HoursRow[] | TasksRow[];
}) {
  if (type === "attendance") {
    return (
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-6 py-3">Сотрудник</th>
            <th className="px-6 py-3">Отдел</th>
            <th className="px-6 py-3 text-right">Дней</th>
            <th className="px-6 py-3 text-right">Опозданий</th>
            <th className="px-6 py-3 text-right">Часов</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {(rows as AttendanceRow[]).map((row) => (
            <tr key={row.userId}>
              <td className="px-6 py-3 font-semibold text-neutral-900">{row.fullName}</td>
              <td className="px-6 py-3 text-neutral-600">{row.departmentName ?? "—"}</td>
              <td className="px-6 py-3 text-right text-neutral-900">{row.daysWorked}</td>
              <td className="px-6 py-3 text-right text-neutral-900">{row.lateCount}</td>
              <td className="px-6 py-3 text-right text-neutral-900">
                {Math.round((row.totalMinutes / 60) * 10) / 10}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (type === "hours") {
    return (
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-6 py-3">Сотрудник</th>
            <th className="px-6 py-3 text-right">Дней</th>
            <th className="px-6 py-3 text-right">Всего часов</th>
            <th className="px-6 py-3 text-right">Среднее</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {(rows as HoursRow[]).map((row) => (
            <tr key={row.userId}>
              <td className="px-6 py-3 font-semibold text-neutral-900">{row.fullName}</td>
              <td className="px-6 py-3 text-right text-neutral-900">{row.daysCount}</td>
              <td className="px-6 py-3 text-right text-neutral-900">
                {Math.round((row.totalMinutes / 60) * 10) / 10}
              </td>
              <td className="px-6 py-3 text-right text-neutral-900">
                {Math.round((row.averageMinutes / 60) * 10) / 10}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
        <tr>
          <th className="px-6 py-3">Сотрудник</th>
          <th className="px-6 py-3 text-right">Назначено</th>
          <th className="px-6 py-3 text-right">Выполнено</th>
          <th className="px-6 py-3 text-right">% выполн.</th>
          <th className="px-6 py-3 text-right">Просрочено</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-200">
        {(rows as TasksRow[]).map((row) => (
          <tr key={row.userId}>
            <td className="px-6 py-3 font-semibold text-neutral-900">{row.fullName}</td>
            <td className="px-6 py-3 text-right text-neutral-900">{row.assigned}</td>
            <td className="px-6 py-3 text-right text-neutral-900">{row.completed}</td>
            <td className="px-6 py-3 text-right text-neutral-900">{row.completionRate}%</td>
            <td className="px-6 py-3 text-right text-danger">{row.overdue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
