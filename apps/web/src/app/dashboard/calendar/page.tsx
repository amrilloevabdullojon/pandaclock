import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card, CardContent, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";

interface CalendarEvent {
  id: string;
  type: "LEAVE_APPROVED" | "LEAVE_PENDING" | "TASK_DEADLINE" | "BIRTHDAY";
  title: string;
  startDate: string;
  endDate: string;
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y, m } = await searchParams;
  const today = new Date();
  const year = Number(y) || today.getUTCFullYear();
  const month = Number(m) || today.getUTCMonth() + 1;
  const { start, end } = monthRange(year, month);

  const events = await serverFetch<CalendarEvent[]>(
    `/calendar/events?start=${start}&end=${end}&scope=all`,
  ).catch(() => [] as CalendarEvent[]);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    const startD = new Date(`${event.startDate}T00:00:00Z`);
    const endD = new Date(`${event.endDate}T00:00:00Z`);
    for (
      let cursor = new Date(startD);
      cursor <= endD;
      cursor = new Date(cursor.getTime() + 86400000)
    ) {
      const key = cursor.toISOString().slice(0, 10);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)?.push(event);
    }
  });

  const grid = buildMonthGrid(year, month);

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Calendar className="h-6 w-6" />}
        title="Календарь"
        description="Отпуска и дедлайны команды"
        actions={
          <nav className="flex items-center gap-2">
            <Link
              href={`/dashboard/calendar?y=${prev.y}&m=${prev.m}`}
              className="border-border bg-card hover:bg-muted focus-ring rounded-md border px-3 py-1.5 text-sm transition-colors"
              aria-label="Предыдущий месяц"
            >
              ←
            </Link>
            <span className="text-foreground min-w-40 text-center text-sm font-bold capitalize">
              {monthLabel(year, month)}
            </span>
            <Link
              href={`/dashboard/calendar?y=${next.y}&m=${next.m}`}
              className="border-border bg-card hover:bg-muted focus-ring rounded-md border px-3 py-1.5 text-sm transition-colors"
              aria-label="Следующий месяц"
            >
              →
            </Link>
          </nav>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((label) => (
              <div key={label} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {grid.map((cell) => {
              const dateKey = cell.date.toISOString().slice(0, 10);
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const isCurrent = cell.month === month;
              return (
                <div
                  key={dateKey}
                  className={[
                    "min-h-[96px] rounded-md border p-2 text-xs",
                    isCurrent
                      ? "border-neutral-200 bg-white"
                      : "border-neutral-100 bg-neutral-50 opacity-60",
                  ].join(" ")}
                >
                  <p className="font-semibold text-neutral-700">{cell.date.getUTCDate()}</p>
                  <ul className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <li
                        key={event.id}
                        className={[
                          "truncate rounded px-1 py-0.5 text-[10px]",
                          event.type === "LEAVE_APPROVED"
                            ? "bg-success-light text-success"
                            : event.type === "LEAVE_PENDING"
                              ? "bg-warning-light text-warning"
                              : "bg-primary-100 text-primary-700",
                        ].join(" ")}
                      >
                        {event.title}
                      </li>
                    ))}
                    {dayEvents.length > 3 ? (
                      <li className="text-[10px] text-neutral-500">+{dayEvents.length - 3} ещё</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function buildMonthGrid(year: number, month: number): { date: Date; month: number }[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // Понедельник = 1, Воскресенье = 0 → нормализуем к понедельнику.
  const dayOfWeek = firstOfMonth.getUTCDay();
  const offset = (dayOfWeek + 6) % 7;
  const start = new Date(firstOfMonth.getTime() - offset * 86400000);
  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(start.getTime() + idx * 86400000);
    return { date, month: date.getUTCMonth() + 1 };
  });
}
