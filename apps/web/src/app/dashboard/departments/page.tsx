import { Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";

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
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-neutral-900">Отделы</h1>
        <p className="text-sm text-neutral-500">
          Структура компании. CRUD-форма будет добавлена в следующем спринте.
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          {tree.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              Пока нет отделов.
            </div>
          ) : (
            <Tree nodes={tree} depth={0} />
          )}
        </CardContent>
      </Card>
    </div>
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
