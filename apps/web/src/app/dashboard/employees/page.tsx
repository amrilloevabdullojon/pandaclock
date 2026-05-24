import Link from "next/link";
import { Badge, Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { InviteEmployees } from "./_components/invite-modal";

interface EmployeesQuery {
  search?: string;
  departmentId?: string;
  status?: string;
}

interface EmployeeRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  position: string | null;
  departmentName: string | null;
}

interface EmployeesResponse {
  items: EmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<EmployeesQuery>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.departmentId) qs.set("departmentId", params.departmentId);
  if (params.status) qs.set("status", params.status);

  const employees = await serverFetch<EmployeesResponse>(
    `/employees${qs.size ? `?${qs.toString()}` : ""}`,
  ).catch(() => ({ items: [], total: 0, page: 1, pageSize: 20 }));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">Сотрудники</h1>
          <p className="text-sm text-neutral-500">Всего {employees.total} человек</p>
        </div>
        <InviteEmployees />
      </header>

      <Card>
        <CardContent className="p-0">
          {employees.items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-4xl">🐼</p>
              <p className="mt-4 text-sm text-neutral-500">
                Пока нет сотрудников. Пригласите первого участника команды.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-6 py-3">Сотрудник</th>
                  <th className="px-6 py-3">Должность</th>
                  <th className="px-6 py-3">Отдел</th>
                  <th className="px-6 py-3">Статус</th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {employees.items.map((employee) => (
                  <tr key={employee.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/employees/${employee.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-700">
                          {employee.firstName.charAt(0)}
                          {employee.lastName.charAt(0)}
                        </span>
                        <span>
                          <span className="block font-semibold text-neutral-900">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <span className="text-xs text-neutral-500">{employee.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-neutral-600">{employee.position ?? "—"}</td>
                    <td className="px-6 py-3 text-neutral-600">
                      {employee.departmentName ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={employee.status} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/employees/${employee.id}`}
                        className="text-primary-500 hover:underline"
                      >
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="success">Активен</Badge>;
    case "PENDING":
      return <Badge variant="warning">Приглашён</Badge>;
    case "SUSPENDED":
      return <Badge variant="secondary">Деактивирован</Badge>;
    case "TERMINATED":
      return <Badge variant="danger">Уволен</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
