import { Building2 } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { CreateDepartment } from "./_components/create-department";

interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  description: string | null;
  children: DepartmentNode[];
}

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
            <Tree nodes={tree} depth={0} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Tree({ nodes, depth }: { nodes: DepartmentNode[]; depth: number }) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <li key={node.id} style={{ paddingLeft: depth * 24 }}>
          <div className="bg-muted flex items-center justify-between rounded-md px-4 py-2">
            <span className="text-foreground font-semibold">{node.name}</span>
            {node.description ? (
              <span className="text-muted-foreground text-xs">{node.description}</span>
            ) : null}
          </div>
          {node.children.length > 0 ? (
            <div className="mt-2">
              <Tree nodes={node.children} depth={depth + 1} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
