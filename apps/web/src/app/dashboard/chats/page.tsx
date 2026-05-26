import { Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
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
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold text-neutral-900">Чаты</h1>
        </header>
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <p className="text-4xl">💬</p>
            <p className="mt-4 text-sm text-neutral-500">
              У вас пока нет чатов. Создайте отдел — чат появится автоматически.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-extrabold text-neutral-900">Чаты</h1>
        <p className="text-sm text-neutral-500">Каналы отделов и личные сообщения</p>
      </header>

      <ChatsView initialChannels={channels} />
    </div>
  );
}
