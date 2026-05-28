import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { Hash, MessageSquare } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Avatar, Divider, EmptyState, Screen, Skeleton } from "@/components/ui";

interface ChannelRow {
  id: string;
  type: "CHANNEL" | "DM";
  name: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessageText?: string | null;
}

export default function ChatsScreen() {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<ChannelRow[]>("/chats/channels");
      setChannels(data);
    } catch {
      setChannels([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const totalUnread = channels.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Screen background="default" edges={["top"]} padded={false}>
      <View className="px-5 pb-3 pt-4">
        <Text className="text-foreground text-2xl font-extrabold">Чаты</Text>
        <Text className="text-muted-foreground mt-1 text-sm">
          {totalUnread > 0
            ? `${totalUnread} непрочитанных в ${channels.length} каналах`
            : `${channels.length} ${
                channels.length === 1 ? "канал" : channels.length < 5 ? "канала" : "каналов"
              }`}
        </Text>
      </View>

      {loading ? (
        <View className="gap-2 px-5 pt-2">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </View>
      ) : channels.length === 0 ? (
        <View className="px-5 pt-6">
          <EmptyState
            emoji="💬"
            title="Чаты появятся скоро"
            description="Канал отдела создаётся автоматически, когда вас добавляют в команду. Или начните личный диалог с коллегой."
          />
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          contentContainerClassName="pb-6"
          ItemSeparatorComponent={() => <Divider className="ml-16" />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B4FE2" />
          }
          renderItem={({ item }) => <ChannelRowItem channel={item} />}
        />
      )}
    </Screen>
  );
}

function ChannelRowItem({ channel }: { channel: ChannelRow }) {
  const isChannel = channel.type === "CHANNEL";
  const displayName = isChannel ? (channel.name ?? "channel") : (channel.name ?? "DM");
  const hasUnread = channel.unreadCount > 0;

  return (
    <Pressable
      onPress={() => router.push(`/chats/${channel.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Открыть ${displayName}`}
      className="active:bg-muted flex-row items-center gap-3 px-5 py-3 dark:active:bg-neutral-800"
    >
      {/* Avatar / icon */}
      {isChannel ? (
        <View className="bg-primary-100 dark:bg-primary-900 h-12 w-12 items-center justify-center rounded-md">
          <Hash size={20} color="#5B4FE2" />
        </View>
      ) : (
        <Avatar size="lg" fallback={displayName.slice(0, 2)} />
      )}

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${
              hasUnread ? "text-foreground font-extrabold" : "text-foreground font-semibold"
            }`}
            numberOfLines={1}
          >
            {isChannel ? `# ${displayName}` : displayName}
          </Text>
          {channel.lastMessageAt ? (
            <Text className="text-muted-foreground ml-2 text-[10px] font-semibold uppercase">
              {formatRelative(channel.lastMessageAt)}
            </Text>
          ) : null}
        </View>

        <View className="mt-0.5 flex-row items-center gap-2">
          <Text
            className={`flex-1 text-xs ${
              hasUnread ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
            numberOfLines={1}
          >
            {channel.lastMessageText ?? "Нет сообщений"}
          </Text>
          {hasUnread ? (
            <View className="bg-primary-500 h-5 min-w-5 items-center justify-center rounded-full px-1.5">
              <Text className="text-[10px] font-bold text-white">
                {channel.unreadCount > 9 ? "9+" : channel.unreadCount}
              </Text>
            </View>
          ) : (
            <MessageSquare size={14} color="#C5C9D6" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = diff / 3_600_000;
  if (hours < 1) {
    const minutes = Math.floor(diff / 60_000);
    return minutes < 1 ? "сейчас" : `${minutes}м`;
  }
  if (hours < 24) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (hours < 24 * 7) {
    return date.toLocaleDateString("ru-RU", { weekday: "short" });
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}
