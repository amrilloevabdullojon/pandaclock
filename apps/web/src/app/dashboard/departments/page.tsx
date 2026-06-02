import { Building2 } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { CreateDepartment } from "./_components/create-department";
import { DepartmentsTree, type DepartmentNode } from "./_components/departments-tree";

function flattenForSelect(nodes: DepartmentNode[], prefix = ""): { id: string; name: string }[] {
  return nodes.flatMap((n) => {
    const fullName = prefix ? `${prefix} / ${n.name}` : n.name;
    return [{ id: n.id, name: fullName }, ...flattenForSelect(n.children, fullName)];
  });
}

export default async function DepartmentsPage() {
  const tree = await serverFetch<DepartmentNode[]>("/departments/tree").catch(() => []);
  const flatOptions = flattenForSelect(tree);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Building2 className="h-6 w-6" />}
        title="Отделы"
        description={
          tree.length === 0
            ? "Создайте первый отдел — это поможет приглашать сотрудников и распределять заявки"
            : `Иерархическая структура компании · ${flatOptions.length} ${flatOptions.length === 1 ? "отдел" : "отделов"}`
        }
        actions={tree.length > 0 ? <CreateDepartment options={flatOptions} /> : undefined}
      />

      <Card>
        <CardContent className="p-6">
          {tree.length === 0 ? (
            <EmptyState
              icon={<Building2 />}
              title="Создайте первый отдел"
              description="Например «Разработка», «Маркетинг», «Бэк-офис». Это иерархия, к которой потом будут привязываться сотрудники."
              action={<CreateDepartment options={flatOptions} />}
            />
          ) : (
            <DepartmentsTree initialTree={tree} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
