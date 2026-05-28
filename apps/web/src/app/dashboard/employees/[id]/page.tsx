import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";

interface EmployeeDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: string;
  status: string;
  position: string | null;
  phone: string | null;
  departmentName: string | null;
  hireDate: string | null;
  birthDate: string | null;
  citizenship: string | null;
  employmentType: string | null;
  emailVerified: boolean;
}

const TABS = [
  { id: "profile", label: "Профиль" },
  { id: "time", label: "Время" },
  { id: "tasks", label: "Задачи" },
  { id: "requests", label: "Заявки" },
  { id: "documents", label: "Документы" },
] as const;

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = TABS.find((t) => t.id === tab)?.id ?? "profile";

  const employee = await serverFetch<EmployeeDetail>(`/employees/${id}`).catch(() => null);
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/employees" className="text-primary-500 text-sm hover:underline">
        ← Назад к списку
      </Link>

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="bg-primary-100 text-primary-700 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-extrabold">
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-foreground text-2xl font-extrabold">
              {employee.firstName} {employee.middleName ?? ""} {employee.lastName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {employee.position ?? "Без должности"} · {employee.departmentName ?? "Без отдела"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={employee.status === "ACTIVE" ? "success" : "warning"}>
                {employee.status}
              </Badge>
              {employee.emailVerified ? (
                <Badge variant="secondary">Email подтверждён</Badge>
              ) : (
                <Badge variant="warning">Email не подтверждён</Badge>
              )}
              <Badge variant="outline">{employee.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <nav className="border-border border-b">
        <ul className="flex gap-6">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/employees/${id}?tab=${t.id}`}
                className={
                  t.id === activeTab
                    ? "border-primary-500 text-primary-700 block border-b-2 px-1 pb-3 text-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground block px-1 pb-3 text-sm font-semibold"
                }
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === "profile" ? <ProfileTab employee={employee} /> : null}
      {activeTab === "time" ? <TimeTab userId={id} /> : null}
      {activeTab === "tasks" ? <TasksTab userId={id} /> : null}
      {activeTab === "requests" ? <RequestsTab userId={id} /> : null}
      {activeTab === "documents" ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <p className="text-4xl">📂</p>
            <p className="text-muted-foreground mt-4 text-sm">
              Документы появятся в следующем релизе.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

async function TimeTab({ userId }: { userId: string }) {
  void userId; // история фильтруется на стороне API через JWT; для админа добавим в Sprint 7
  const history = await serverFetch<
    {
      date: string;
      startedAt: string;
      finishedAt: string | null;
      totalMinutes: number | null;
      isLate: boolean;
    }[]
  >("/time/history?days=30").catch(() => []);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wider">
          История за 30 дней
        </h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Нет записей.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs font-semibold uppercase">
              <tr>
                <th className="py-2">Дата</th>
                <th>Начало</th>
                <th>Окончание</th>
                <th>Часов</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {history.map((entry) => (
                <tr key={entry.date}>
                  <td className="text-foreground py-2 font-semibold">{entry.date}</td>
                  <td>{formatTime(entry.startedAt)}</td>
                  <td>{entry.finishedAt ? formatTime(entry.finishedAt) : "—"}</td>
                  <td>
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
  );
}

async function TasksTab({ userId }: { userId: string }) {
  const items = await serverFetch<
    { id: string; title: string; status: string; priority: string; deadline: string | null }[]
  >(`/tasks?assigneeId=${userId}`).catch(() => []);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wider">
          Назначенные задачи · {items.length}
        </h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Нет активных задач.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((task) => (
              <li
                key={task.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <Link
                  href={`/dashboard/tasks/${task.id}`}
                  className="text-foreground hover:text-primary-500 font-semibold"
                >
                  {task.title}
                </Link>
                <Badge
                  variant={
                    task.status === "DONE"
                      ? "success"
                      : task.status === "REJECTED"
                        ? "danger"
                        : task.status === "IN_PROGRESS"
                          ? "warning"
                          : "default"
                  }
                >
                  {task.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function RequestsTab({ userId }: { userId: string }) {
  const items = await serverFetch<
    {
      id: string;
      userId: string;
      type: string;
      startDate: string;
      endDate: string;
      status: string;
      daysCount: number;
    }[]
  >("/requests?scope=all").catch(() => []);
  const filtered = items.filter((item) => item.userId === userId);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wider">
          Заявки · {filtered.length}
        </h2>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Заявок нет.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((req) => (
              <li
                key={req.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-foreground font-semibold">{req.type}</span>{" "}
                  <span className="text-muted-foreground">
                    {req.startDate} → {req.endDate} ({req.daysCount} д.)
                  </span>
                </span>
                <Badge
                  variant={
                    req.status === "APPROVED"
                      ? "success"
                      : req.status === "REJECTED"
                        ? "danger"
                        : req.status === "PENDING"
                          ? "warning"
                          : "secondary"
                  }
                >
                  {req.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function ProfileTab({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Основная информация
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Email">{employee.email}</Row>
            <Row label="Телефон">{employee.phone ?? "—"}</Row>
            <Row label="Дата рождения">{employee.birthDate ?? "—"}</Row>
            <Row label="Гражданство">{employee.citizenship ?? "—"}</Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Работа
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Должность">{employee.position ?? "—"}</Row>
            <Row label="Отдел">{employee.departmentName ?? "—"}</Row>
            <Row label="Тип занятости">{employee.employmentType ?? "—"}</Row>
            <Row label="Дата найма">{employee.hireDate ?? "—"}</Row>
            <Row label="Роль">{employee.role}</Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border/60 flex items-center justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-semibold">{children}</dd>
    </div>
  );
}
