import { Network } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { OrgView, type DepartmentOption } from "./_components/org-view";

interface DepartmentRow {
  id: string;
  name: string;
}

export default async function OrgPage() {
  const departments = await serverFetch<DepartmentRow[]>("/departments").catch(
    () => [] as DepartmentRow[],
  );
  const options: DepartmentOption[] = departments.map((d) => ({ id: d.id, name: d.name }));

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Network className="h-6 w-6" />}
        title="Оргструктура"
        description="Структура компании и штатное расписание"
      />
      <OrgView departments={options} />
    </>
  );
}
