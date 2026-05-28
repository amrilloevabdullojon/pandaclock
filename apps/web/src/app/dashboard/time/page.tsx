import { Clock } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-bold">Сейчас на работе</h2>
            <span className="text-muted-foreground text-xs">{working.length} активных</span>
          </div>
          {working.length === 0 ? (
            <EmptyState
              compact
              icon={<Clock />}
              title="Никто ещё не отметился"
              description="Сотрудники появятся здесь после клик-ина в мобильном приложении"
            />
          ) : (
            <ul className="divide-border divide-y">
              {working.map((p) => (
                <li
                  key={p.userId}
                  className="hover:bg-muted/40 -mx-3 flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                      {p.firstName.charAt(0)}
                      {p.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate font-semibold">
                      {p.firstName} {p.lastName}
                    </p>
                    {p.departmentName && (
                      <p className="text-muted-foreground truncate text-xs">{p.departmentName}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    с{" "}
                    {new Date(p.startedAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant={p.status === "WORKING" ? "success" : "warning"} dot>
                    {p.status === "WORKING" ? "Работает" : "Перерыв"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h2 className="text-foreground text-lg font-bold">Моя история</h2>
              <p className="text-muted-foreground text-xs">за последние 14 дней</p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                compact
                icon={<Clock />}
                title="Пока нет записей"
                description="История клик-инов появится после первой отметки"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Начало</TableHead>
                  <TableHead>Окончание</TableHead>
                  <TableHead className="text-right">Часов</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell className="text-foreground font-semibold tabular-nums">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {new Date(entry.startedAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {entry.finishedAt
                        ? new Date(entry.finishedAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-foreground text-right font-semibold tabular-nums">
                      {entry.totalMinutes !== null
                        ? `${Math.floor(entry.totalMinutes / 60)}ч ${entry.totalMinutes % 60}м`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {entry.isLate ? (
                        <Badge variant="danger" dot>
                          Опоздание
                        </Badge>
                      ) : (
                        <Badge variant="success" dot>
                          Вовремя
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
    timeZone: "UTC",
  });
}
