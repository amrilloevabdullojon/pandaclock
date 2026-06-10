import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { ApprovalsView } from "./_components/approvals-view";

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<ClipboardCheck className="h-6 w-6" />}
        title="Согласования"
        description="Командировки и расходы, ожидающие вашего решения"
      />
      <ApprovalsView />
    </>
  );
}
