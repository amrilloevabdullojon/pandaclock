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
      <Link href="/dashboard/employees" className="text-sm text-primary-500 hover:underline">
        ← Назад к списку
      </Link>

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-extrabold text-primary-700">
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-neutral-900">
              {employee.firstName} {employee.middleName ?? ""} {employee.lastName}
            </h1>
            <p className="text-sm text-neutral-500">
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

      <nav className="border-b border-neutral-200">
        <ul className="flex gap-6">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/employees/${id}?tab=${t.id}`}
                className={
                  t.id === activeTab
                    ? "block border-b-2 border-primary-500 px-1 pb-3 text-sm font-semibold text-primary-700"
                    : "block px-1 pb-3 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
                }
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === "profile" ? <ProfileTab employee={employee} /> : null}
      {activeTab !== "profile" ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <p className="text-4xl">🐼</p>
            <p className="mt-4 text-sm text-neutral-500">
              Эта вкладка появится в следующих спринтах.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ProfileTab({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
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
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-semibold text-neutral-900">{children}</dd>
    </div>
  );
}
