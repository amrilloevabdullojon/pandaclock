import { MessageCircle } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { ChatsView } from "./_components/chats-view";

interface ChannelRow {
  id: string;
  type: "CHANNEL" | "DM";
  name: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

export default async function ChatsPage() {
  const channels = await serverFetch<ChannelRow[]>("/chats/channels").catch(() => []);

  if (channels.length === 0) {
    return (
      <>
        <PageHeader
          breadcrumbs={<PageBreadcrumbs />}
          icon={<MessageCircle className="h-6 w-6" />}
          title="Чаты"
          description="Каналы отделов и личные сообщения"
        />
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<MessageCircle />}
              title="Пока нет чатов"
              description="Создайте отдел — командный чат появится автоматически. Или начните личную переписку с коллегой."
            />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<MessageCircle className="h-6 w-6" />}
        title="Чаты"
        description="Каналы отделов и личные сообщения"
      />
      <ChatsView initialChannels={channels} />
    </>
  );
}
