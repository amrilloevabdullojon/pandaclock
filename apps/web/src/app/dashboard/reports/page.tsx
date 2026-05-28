import Link from "next/link";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
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

function ReportTable({
  type,
  rows,
}: {
  type: ReportType;
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
