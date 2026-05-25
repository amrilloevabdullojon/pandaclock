import { Avatar, AvatarFallback, Badge, Card, CardContent } from "@pandaclock/ui";
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
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-neutral-900">Обзор команды</h1>
        <p className="text-sm text-neutral-500">Что происходит в компании прямо сейчас</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Сотрудников" value={counts.totalEmployees} />
        <KpiCard label="На работе сейчас" value={counts.workingNow} accent="success" />
        <KpiCard label="Опоздали сегодня" value={counts.lateToday} accent="warning" />
        <KpiCard label="В отпуске" value={counts.onLeave} />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Кто на работе сейчас</h2>
            <span className="text-sm text-neutral-500">{working.length} человек</span>
          </div>

          {working.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">
              Пока никто не отметился. Сотрудники появятся здесь сразу после клик-ина в мобильном
              приложении.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {working.map((person) => (
                <li key={person.userId} className="flex items-center gap-4 py-3">
                  <Avatar>
                    <AvatarFallback>
                      {person.firstName.charAt(0)}
                      {person.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {person.departmentName ?? "—"} · с{" "}
                      {new Date(person.startedAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant={person.status === "WORKING" ? "success" : "warning"}>
                    {person.status === "WORKING" ? "На работе" : "Перерыв"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "warning";
}) {
  const accentClass =
    accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-neutral-900";
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <p className={`mt-2 text-3xl font-extrabold ${accentClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
