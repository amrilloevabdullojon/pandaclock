import { Users } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { hasPermission } from "@pandaclock/types";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { TablePagination } from "../_components/table-pagination";
import { EmployeesFilters } from "./_components/employees-filters";
import { EmployeesTable } from "./_components/employees-table";
import { InviteEmployees } from "./_components/invite-modal";

interface EmployeesQuery {
  search?: string;
  departmentId?: string;
  status?: string;
  page?: string;
  pageSize?: string;
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

interface DepartmentNode {
  id: string;
  name: string;
  children: DepartmentNode[];
}

function flattenDepartments(nodes: DepartmentNode[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  function walk(arr: DepartmentNode[], prefix = "") {
    arr.forEach((n) => {
      const name = prefix ? `${prefix} / ${n.name}` : n.name;
      out.push({ id: n.id, name });
      if (n.children.length) walk(n.children, name);
    });
  }
  walk(nodes);
  return out;
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
  if (params.page) qs.set("page", params.page);
  if (params.pageSize) qs.set("pageSize", params.pageSize);

  const [employees, departmentTree, me] = await Promise.all([
    serverFetch<EmployeesResponse>(`/employees${qs.size ? `?${qs.toString()}` : ""}`).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })),
    serverFetch<DepartmentNode[]>("/departments/tree").catch(() => [] as DepartmentNode[]),
    serverFetch<{ role: string }>("/auth/me").catch(() => null),
  ]);

  const departments = flattenDepartments(departmentTree);
  const hasFilters = !!(params.search || params.departmentId || params.status);
  const canInvite = me ? hasPermission(me.role, "employees:invite") : false;

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Users className="h-6 w-6" />}
        title="Сотрудники"
        description={`В команде ${employees.total} ${
          employees.total === 1 ? "человек" : employees.total < 5 ? "человека" : "человек"
        }`}
        actions={canInvite ? <InviteEmployees /> : undefined}
      />

      <EmployeesFilters departments={departments} />

      <Card>
        <CardContent className="p-0">
          {employees.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Users />}
                title={hasFilters ? "Ничего не найдено" : "Пока нет сотрудников"}
                description={
                  hasFilters
                    ? "Попробуйте сменить фильтры или сбросить их"
                    : "Пригласите первого участника команды — он получит письмо со ссылкой для входа"
                }
                action={hasFilters || !canInvite ? undefined : <InviteEmployees />}
              />
            </div>
          ) : (
            <>
              <EmployeesTable items={employees.items} />
              <TablePagination
                page={employees.page}
                pageSize={employees.pageSize}
                total={employees.total}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
