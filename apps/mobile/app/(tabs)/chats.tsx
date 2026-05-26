import { useCallback, useEffect, useState } from "react";
import { SafeAreaView, View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api-client";

interface ChannelRow {
  id: string;
  type: "CHANNEL" | "DM";
  name: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
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

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="px-6 pt-6">
        <Text className="text-2xl font-extrabold text-neutral-900">Чаты</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5B4FE2" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {channels.length === 0 ? (
            <View className="items-center pt-20">
              <Text className="text-5xl">💬</Text>
              <Text className="mt-4 text-center text-sm text-neutral-500">
                Чаты появятся, когда вас добавят в канал отдела.
              </Text>
            </View>
          ) : (
            channels.map((channel) => (
              <Pressable
                key={channel.id}
                onPress={() => router.push(`/chats/${channel.id}`)}
                className="mb-2 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm active:bg-neutral-50"
              >
                <View className="flex-1">
                  <Text className="text-base font-semibold text-neutral-900">
                    {channel.type === "CHANNEL"
                      ? `# ${channel.name ?? "channel"}`
                      : channel.name ?? "DM"}
                  </Text>
                  {channel.lastMessageAt ? (
                    <Text className="mt-1 text-xs text-neutral-500">
                      {new Date(channel.lastMessageAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>
                {channel.unreadCount > 0 ? (
                  <View className="rounded-pill bg-primary-500 px-3 py-1">
                    <Text className="text-xs font-bold text-white">{channel.unreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
