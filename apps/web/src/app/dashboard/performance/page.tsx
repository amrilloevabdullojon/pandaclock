import { Target } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { PerformanceView, type EmployeeOption } from "./_components/performance-view";

interface EmployeesResponse {
  items: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }[];
}

export default async function PerformancePage() {
  const employees = await serverFetch<EmployeesResponse>(
    "/employees?pageSize=100&status=ACTIVE",
  ).catch(() => ({ items: [] }) as EmployeesResponse);

  const options: EmployeeOption[] = employees.items.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`.trim(),
    avatarUrl: e.avatarUrl,
  }));

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Target className="h-6 w-6" />}
        title="Эффективность"
        description="Цели (OKR) и оценки эффективности команды"
      />
      <PerformanceView employees={options} />
    </>
  );
}
