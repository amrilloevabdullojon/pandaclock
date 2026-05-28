import { Building2 } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";

interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  description: string | null;
  children: DepartmentNode[];
}

export default async function DepartmentsPage() {
  const tree = await serverFetch<DepartmentNode[]>("/departments/tree").catch(() => []);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Building2 className="h-6 w-6" />}
        title="Отделы"
        description="Иерархическая структура компании"
      />

      <Card>
        <CardContent className="p-6">
          {tree.length === 0 ? (
            <EmptyState
              icon={<Building2 />}
              title="Пока нет отделов"
              description="Структура появится здесь, как только вы добавите первый отдел"
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
          <div className="flex items-center justify-between rounded-md bg-neutral-50 px-4 py-2">
            <span className="font-semibold text-neutral-900">{node.name}</span>
            {node.description ? (
              <span className="text-xs text-neutral-500">{node.description}</span>
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
