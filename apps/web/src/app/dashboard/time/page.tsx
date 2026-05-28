import { Clock } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";

interface WorkingPerson {
  userId: string;
  firstName: string;
  lastName: string;
  status: "WORKING" | "ON_BREAK";
  startedAt: string;
  departmentName: string | null;
}

interface HistoryEntry {
  date: string;
  startedAt: string;
  finishedAt: string | null;
  totalMinutes: number | null;
  isLate: boolean;
}

export default async function TimePage() {
  const [working, history] = await Promise.all([
    serverFetch<WorkingPerson[]>("/time/who-is-working").catch(() => []),
    serverFetch<HistoryEntry[]>("/time/history?days=14").catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Clock className="h-6 w-6" />}
        title="Учёт времени"
        description="Кто на работе, история клик-инов и опоздания"
      />

      <Card>
        <CardContent className="p-6">
          <h2 className="text-foreground mb-4 text-lg font-bold">Сейчас на работе</h2>
          {working.length === 0 ? (
            <EmptyState
              compact
              icon={<Clock />}
              title="Никто ещё не отметился"
              description="Сотрудники появятся здесь после клик-ина в мобильном приложении"
            />
          ) : (
            <ul className="space-y-2">
              {working.map((p) => (
                <li
                  key={p.userId}
                  className="flex items-center justify-between rounded-md bg-neutral-50 px-4 py-2 text-sm"
                >
                  <span className="font-semibold text-neutral-900">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-neutral-500">
                    {new Date(p.startedAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant={p.status === "WORKING" ? "success" : "warning"}>
                    {p.status === "WORKING" ? "Работает" : "Перерыв"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-foreground mb-4 text-lg font-bold">Моя история за 2 недели</h2>
          {history.length === 0 ? (
            <EmptyState
              compact
              icon={<Clock />}
              title="Пока нет записей"
              description="История клик-инов появится после первой отметки"
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase text-neutral-500">
                <tr>
                  <th className="py-2">Дата</th>
                  <th>Начало</th>
                  <th>Окончание</th>
                  <th>Часов</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {history.map((entry) => (
                  <tr key={entry.date}>
                    <td className="py-2 font-semibold text-neutral-900">{entry.date}</td>
                    <td className="text-neutral-600">
                      {new Date(entry.startedAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="text-neutral-600">
                      {entry.finishedAt
                        ? new Date(entry.finishedAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="text-neutral-900">
                      {entry.totalMinutes !== null
                        ? `${Math.floor(entry.totalMinutes / 60)}ч ${entry.totalMinutes % 60}м`
                        : "—"}
                    </td>
                    <td>
                      {entry.isLate ? (
                        <Badge variant="danger">Опоздание</Badge>
                      ) : (
                        <Badge variant="success">Вовремя</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
