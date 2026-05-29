import { Shield } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../../_components/page-breadcrumbs";
import { AuditTable } from "./_components/audit-table";

interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

interface ListResponse {
  items: AuditEntry[];
  nextCursor: string | null;
}

interface MeResponse {
  role: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; userId?: string; action?: string }>;
}) {
  const me = await serverFetch<MeResponse>("/auth/me").catch(() => null);
  const allowed = me && (me.role === "OWNER" || me.role === "HR");

  if (!allowed) {
    return (
      <>
        <PageHeader
          breadcrumbs={<PageBreadcrumbs />}
          icon={<Shield className="h-6 w-6" />}
          title="Журнал действий"
          description="Только для владельцев и HR"
        />
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Shield />}
              title="Нет доступа"
              description="Эта страница доступна только пользователям с ролью OWNER или HR."
            />
          </CardContent>
        </Card>
      </>
    );
  }

  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("limit", "50");
  if (params.entityType) qs.set("entityType", params.entityType);
  if (params.userId) qs.set("userId", params.userId);
  if (params.action) qs.set("action", params.action);

  const [data, entityTypes] = await Promise.all([
    serverFetch<ListResponse>(`/audit?${qs.toString()}`).catch(
      () => ({ items: [], nextCursor: null }) as ListResponse,
    ),
    serverFetch<string[]>("/audit/entity-types").catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Shield className="h-6 w-6" />}
        title="Журнал действий"
        description="Все мутации в системе. Видно только OWNER и HR."
      />

      <AuditTable
        initialItems={data.items}
        initialCursor={data.nextCursor}
        entityTypes={entityTypes}
      />
    </>
  );
}
