import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
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
import { TablePagination } from "../_components/table-pagination";
import { EmployeesFilters } from "./_components/employees-filters";
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

  const [employees, departmentTree] = await Promise.all([
    serverFetch<EmployeesResponse>(`/employees${qs.size ? `?${qs.toString()}` : ""}`).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })),
    serverFetch<DepartmentNode[]>("/departments/tree").catch(() => [] as DepartmentNode[]),
  ]);

  const departments = flattenDepartments(departmentTree);
  const hasFilters = !!(params.search || params.departmentId || params.status);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Users className="h-6 w-6" />}
        title="Сотрудники"
        description={`В команде ${employees.total} ${
          employees.total === 1 ? "человек" : employees.total < 5 ? "человека" : "человек"
        }`}
        actions={<InviteEmployees />}
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
                action={hasFilters ? undefined : <InviteEmployees />}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Отдел</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead aria-hidden />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.items.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/employees/${employee.id}`}
                          className="focus-ring group flex items-center gap-3 rounded-sm"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                              {employee.firstName.charAt(0)}
                              {employee.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-foreground group-hover:text-primary-600 truncate font-semibold">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {employee.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {employee.position ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {employee.departmentName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={employee.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/employees/${employee.id}`}
                          aria-label={`Открыть ${employee.firstName} ${employee.lastName}`}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="success" dot>
          Активен
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="warning" dot>
          Приглашён
        </Badge>
      );
    case "SUSPENDED":
      return <Badge variant="secondary">Деактивирован</Badge>;
    case "TERMINATED":
      return (
        <Badge variant="danger" dot>
          Уволен
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
