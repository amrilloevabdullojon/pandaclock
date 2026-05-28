import { Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader, cn } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { CalendarLegend } from "./_components/calendar-legend";
import { CalendarToolbar } from "./_components/calendar-toolbar";
import { EVENT_META, type CalendarEvent } from "./_components/event-types";

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
  searchParams: Promise<{ y?: string; m?: string; view?: string }>;
}) {
  const { y, m, view: viewParam } = await searchParams;
  const view: "month" | "agenda" = viewParam === "agenda" ? "agenda" : "month";

  const today = new Date();
  const year = Number(y) || today.getUTCFullYear();
  const month = Number(m) || today.getUTCMonth() + 1;
  const { start, end } = monthRange(year, month);

  const events = await serverFetch<CalendarEvent[]>(
    `/calendar/events?start=${start}&end=${end}&scope=all`,
  ).catch(() => [] as CalendarEvent[]);

  // Группируем события по дате (для month view)
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

  // Подсчёт по типам — для легенды.
  const counts: Record<keyof typeof EVENT_META, number> = {
    LEAVE_APPROVED: 0,
    LEAVE_PENDING: 0,
    TASK_DEADLINE: 0,
    BIRTHDAY: 0,
  };
  events.forEach((e) => {
    counts[e.type] += 1;
  });

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const todayCoord = { y: today.getUTCFullYear(), m: today.getUTCMonth() + 1 };

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<CalendarIcon className="h-6 w-6" />}
        title="Календарь"
        description="Отпуска, дедлайны и события команды"
      />

      <CalendarToolbar
        view={view}
        monthLabel={monthLabel(year, month)}
        prev={prev}
        next={next}
        today={todayCoord}
      />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <CalendarLegend counts={counts} />

          {view === "month" ? (
            <MonthView
              year={year}
              month={month}
              eventsByDate={eventsByDate}
              todayIso={today.toISOString().slice(0, 10)}
            />
          ) : (
            <AgendaView events={events} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MonthView({
  year,
  month,
  eventsByDate,
  todayIso,
}: {
  year: number;
  month: number;
  eventsByDate: Map<string, CalendarEvent[]>;
  todayIso: string;
}) {
  const grid = buildMonthGrid(year, month);
  return (
    <div>
      <div className="border-border text-muted-foreground grid grid-cols-7 border-b pb-2 text-[10px] font-bold uppercase tracking-wider">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((label, idx) => (
          <div
            key={label}
            className={cn("px-2 py-1 text-center", idx >= 5 && "text-muted-foreground/70")}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 pt-2">
        {grid.map((cell, idx) => {
          const dateKey = cell.date.toISOString().slice(0, 10);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const isCurrent = cell.month === month;
          const isToday = dateKey === todayIso;
          const isWeekend = idx % 7 >= 5;
          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[100px] rounded-sm border p-1.5 text-xs transition-colors",
                isCurrent ? "border-border bg-card" : "bg-muted/30 border-transparent opacity-60",
                isToday && "ring-primary-500 ring-offset-card ring-2 ring-offset-1",
                isWeekend && isCurrent && "bg-muted/30",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                    isToday
                      ? "bg-primary-500 text-white"
                      : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {cell.date.getUTCDate()}
                </span>
                {dayEvents.length > 3 && (
                  <span className="text-muted-foreground text-[9px] font-semibold tabular-nums">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>
              <ul className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const meta = EVENT_META[event.type];
                  return (
                    <li
                      key={`${dateKey}-${event.id}`}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                        meta.bg,
                        meta.text,
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarIcon />}
        title="В этом месяце ничего не запланировано"
        description="Создайте заявку на отпуск или добавьте дедлайн к задаче"
      />
    );
  }

  // Группируем по дате-начала.
  const byDate = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    if (!byDate.has(e.startDate)) byDate.set(e.startDate, []);
    byDate.get(e.startDate)!.push(e);
  });
  const sortedDates = Array.from(byDate.keys()).sort();

  return (
    <ul className="space-y-4">
      {sortedDates.map((dateKey) => {
        const items = byDate.get(dateKey)!;
        return (
          <li key={dateKey} className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="text-sm">
              <p className="text-foreground font-bold">{formatAgendaDate(dateKey)}</p>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                {formatWeekday(dateKey)}
              </p>
            </div>
            <ul className="space-y-1.5">
              {items.map((event) => {
                const meta = EVENT_META[event.type];
                const isRange = event.startDate !== event.endDate;
                return (
                  <li
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 rounded-sm border p-3 text-sm",
                      meta.bg,
                      meta.border,
                    )}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-semibold leading-snug", meta.text)}>{event.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {meta.label.replace(/^\W+/u, "")}
                        {isRange && ` · до ${formatAgendaDate(event.endDate)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function buildMonthGrid(year: number, month: number): { date: Date; month: number }[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // Понедельник = 1, Воскресенье = 0 → нормализуем к понедельнику.
  const dayOfWeek = firstOfMonth.getUTCDay();
  const offset = (dayOfWeek + 6) % 7;
  const startOfGrid = new Date(firstOfMonth.getTime() - offset * 86400000);
  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(startOfGrid.getTime() + idx * 86400000);
    return { date, month: date.getUTCMonth() + 1 };
  });
}

function formatAgendaDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ru-RU", {
    weekday: "long",
    timeZone: "UTC",
  });
}
