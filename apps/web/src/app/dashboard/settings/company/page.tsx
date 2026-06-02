import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardContent, PageHeader } from "@pandaclock/ui";
import { hasPermission } from "@pandaclock/types";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../../_components/page-breadcrumbs";
import { CompanyPolicyForm, type TimePolicy } from "./_components/policy-form";
import { CompanyProfileForm, type TenantProfile } from "./_components/profile-form";

export default async function CompanySettingsPage() {
  const [policy, profile, me] = await Promise.all([
    serverFetch<TimePolicy>("/tenant/policy").catch(() => null),
    serverFetch<TenantProfile>("/tenant/profile").catch(() => null),
    serverFetch<{ role: string }>("/auth/me").catch(() => null),
  ]);
  if (!policy || !profile) notFound();
  const canEdit = me ? hasPermission(me.role, "tenant:settings") : false;

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Building2 className="h-6 w-6" />}
        title="Настройки компании"
        description="Профиль, расписание, рабочие дни, геофенс и лимиты отпусков"
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <CompanyProfileForm initial={profile} canEdit={canEdit} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <CompanyPolicyForm initial={policy} canEdit={canEdit} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
