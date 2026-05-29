import { Bell } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { NotificationsList } from "./_components/notifications-list";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface ListResponse {
  items: NotificationItem[];
  nextCursor: string | null;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ unread?: string }>;
}) {
  const params = await searchParams;
  const onlyUnread = params.unread === "1";

  const data = await serverFetch<ListResponse>(
    `/notifications?limit=50${onlyUnread ? "&onlyUnread=true" : ""}`,
  ).catch(() => ({ items: [], nextCursor: null }) as ListResponse);

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<Bell className="h-6 w-6" />}
        title="Уведомления"
        description="События из задач, заявок и команды"
      />

      {data.items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Bell />}
              title={onlyUnread ? "Нет непрочитанных" : "Пока ничего нового"}
              description={
                onlyUnread
                  ? "Вы прочитали все уведомления. Так держать!"
                  : "Здесь появятся события из задач, заявок и команды"
              }
            />
          </CardContent>
        </Card>
      ) : (
        <NotificationsList
          initialItems={data.items}
          initialCursor={data.nextCursor}
          onlyUnread={onlyUnread}
        />
      )}
    </>
  );
}
