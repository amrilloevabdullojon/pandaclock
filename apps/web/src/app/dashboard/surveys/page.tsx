import { ClipboardList } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { SurveysView } from "./_components/surveys-view";

export default function SurveysPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<ClipboardList className="h-6 w-6" />}
        title="Опросы"
        description="Опросы вовлечённости и eNPS"
      />
      <SurveysView />
    </>
  );
}
