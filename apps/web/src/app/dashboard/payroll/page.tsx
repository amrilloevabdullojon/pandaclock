import { Wallet } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { PayrollView } from "./_components/payroll-view";

interface EmployeesResponse {
  items: { id: string; firstName: string; lastName: string }[];
}

export default async function PayrollPage() {
  const employees = await serverFetch<EmployeesResponse>(
    "/employees?pageSize=100&status=ACTIVE",
  ).catch(() => ({ items: [] }) as EmployeesResponse);

  const names: Record<string, string> = {};
  for (const e of employees.items) names[e.id] = `${e.firstName} ${e.lastName}`.trim();

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Wallet className="h-6 w-6" />}
        title="Зарплата"
        description="Оклады, расчётные периоды и расчётные листки"
      />
      <PayrollView employeeNames={names} />
    </>
  );
}
