import { MessageCircle } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
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
  const [channels, me] = await Promise.all([
    serverFetch<ChannelRow[]>("/chats/channels").catch(() => [] as ChannelRow[]),
    serverFetch<{
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    }>("/auth/me").catch(() => null),
  ]);

  const meName = me ? `${me.firstName} ${me.lastName}`.trim() : "";

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<MessageCircle className="h-6 w-6" />}
        title="Чаты"
        description="Каналы отделов и личные сообщения"
      />
      <ChatsView
        initialChannels={channels}
        meId={me?.id ?? ""}
        meName={meName}
        meAvatarUrl={me?.avatarUrl ?? null}
      />
    </>
  );
}
