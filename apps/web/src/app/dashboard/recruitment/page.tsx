import { Briefcase } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { RecruitmentView, type DepartmentOption } from "./_components/recruitment-view";

interface DepartmentRow {
  id: string;
  name: string;
}

export default async function RecruitmentPage() {
  const departments = await serverFetch<DepartmentRow[]>("/departments").catch(
    () => [] as DepartmentRow[],
  );

  const options: DepartmentOption[] = departments.map((d) => ({ id: d.id, name: d.name }));

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Briefcase className="h-6 w-6" />}
        title="Найм"
        description="Вакансии и воронка кандидатов (ATS)"
      />
      <RecruitmentView departments={options} />
    </>
  );
}
