import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Megaphone, Pin } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, Card, EmptyState, Screen } from "@/components/ui";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorName: string | null;
  read: boolean;
  createdAt: string;
}

export default function AnnouncementsScreen() {
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api<Announcement[]>("/announcements");
      setItems(data);
      setError(false);
      for (const a of data) {
        if (!a.read) void api(`/announcements/${a.id}/read`, { method: "POST" }).catch(() => {});
      }
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="border-border flex-row items-center gap-3 border-b px-5 pb-3 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Назад">
          <ArrowLeft size={24} color="#5B4FE2" />
        </Pressable>
        <View>
          <Text className="text-foreground text-lg font-extrabold">Объявления</Text>
          <Text className="text-muted-foreground text-xs">Новости компании</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<Megaphone size={40} color="#9CA3AF" />}
            title="Не удалось загрузить"
            description="Проверьте соединение и потяните вниз."
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor="#5B4FE2"
            />
          }
        >
          {items.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={40} color="#9CA3AF" />}
              title="Объявлений нет"
              description="Новости компании появятся здесь."
            />
          ) : (
            items.map((a) => (
              <Card key={a.id} className="mb-3" padding="md">
                <View className="flex-row items-center gap-2">
                  {a.pinned ? <Pin size={14} color="#5B4FE2" /> : null}
                  <Text className="text-foreground flex-1 text-base font-bold">{a.title}</Text>
                  {!a.read ? <Badge variant="info">Новое</Badge> : null}
                </View>
                <Text className="text-muted-foreground mt-0.5 text-xs">
                  {a.authorName ?? "—"} · {new Date(a.createdAt).toLocaleDateString("ru-RU")}
                </Text>
                {a.body ? (
                  <Text className="text-foreground mt-2 text-sm leading-6">{a.body}</Text>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
