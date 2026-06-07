import { CalendarClock } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { ShiftsPlanner, type EmployeeOption } from "./_components/shifts-planner";

interface EmployeesResponse {
  items: {
    id: string;
    firstName: string;
    lastName: string;
    departmentName: string | null;
    avatarUrl: string | null;
    status: string;
  }[];
}

export default async function ShiftsPage() {
  const employees = await serverFetch<EmployeesResponse>(
    "/employees?pageSize=100&status=ACTIVE",
  ).catch(() => ({ items: [] }) as EmployeesResponse);

  const options: EmployeeOption[] = employees.items.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`.trim(),
    departmentName: e.departmentName,
    avatarUrl: e.avatarUrl,
  }));

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<CalendarClock className="h-6 w-6" />}
        title="Смены"
        description="Планирование графика смен команды"
      />
      <ShiftsPlanner employees={options} />
    </>
  );
}
