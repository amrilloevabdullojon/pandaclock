import { Megaphone } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { AnnouncementsView } from "./_components/announcements-view";

export default function AnnouncementsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Megaphone className="h-6 w-6" />}
        title="Объявления"
        description="Новости и объявления компании"
      />
      <AnnouncementsView />
    </>
  );
}
