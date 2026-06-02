import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardContent, PageHeader } from "@pandaclock/ui";
import { hasPermission } from "@pandaclock/types";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../../_components/page-breadcrumbs";
import { CompanyPolicyForm, type TimePolicy } from "./_components/policy-form";

export default async function CompanySettingsPage() {
  const [policy, me] = await Promise.all([
    serverFetch<TimePolicy>("/tenant/policy").catch(() => null),
    serverFetch<{ role: string }>("/auth/me").catch(() => null),
  ]);
  if (!policy) notFound();
  const canEdit = me ? hasPermission(me.role, "tenant:settings") : false;

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Building2 className="h-6 w-6" />}
        title="Настройки компании"
        description="Расписание, рабочие дни и геофенс для подтверждения присутствия в офисе"
      />

      <Card>
        <CardContent className="p-6">
          <CompanyPolicyForm initial={policy} canEdit={canEdit} />
        </CardContent>
      </Card>
    </>
  );
}
