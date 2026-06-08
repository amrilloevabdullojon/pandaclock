import { Laptop } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { AssetsView, type EmployeeOption } from "./_components/assets-view";

interface EmployeesResponse {
  items: { id: string; firstName: string; lastName: string }[];
}

export default async function AssetsPage() {
  const employees = await serverFetch<EmployeesResponse>(
    "/employees?pageSize=100&status=ACTIVE",
  ).catch(() => ({ items: [] }) as EmployeesResponse);

  const options: EmployeeOption[] = employees.items.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`.trim(),
  }));

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Laptop className="h-6 w-6" />}
        title="Активы"
        description="Учёт оборудования и его выдача сотрудникам"
      />
      <AssetsView employees={options} />
    </>
  );
}
