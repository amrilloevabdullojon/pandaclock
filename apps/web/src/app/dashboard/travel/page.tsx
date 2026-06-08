import { Plane } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { TravelView } from "./_components/travel-view";

export default function TravelPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Plane className="h-6 w-6" />}
        title="Командировки"
        description="Поездки и расходы с одобрением"
      />
      <TravelView />
    </>
  );
}
