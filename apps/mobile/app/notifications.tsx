import * as React from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { mapLinkToMobileRoute } from "@/lib/use-push-notifications";
import { Card, EmptyState, Screen } from "@/components/ui";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  TASK_ASSIGNED: "Задача",
  TASK_COMMENT: "Комментарий",
  REQUEST_CREATED: "Заявка",
  REQUEST_DECIDED: "Заявка",
  CHAT_MESSAGE: "Чат",
};

export default function NotificationsScreen() {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api<NotificationItem[]>("/notifications?limit=50");
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function markAllRead() {
    try {
      await api("/notifications/mark-all-read", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      // silent
    }
  }

  return (
    <Screen background="default" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="border-border flex-row items-center justify-between border-b px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Назад">
          <ArrowLeft size={22} color="#1F2233" />
        </Pressable>
        <Text className="text-foreground text-lg font-extrabold">Уведомления</Text>
        <Pressable
          onPress={() => void markAllRead()}
          hitSlop={8}
          accessibilityLabel="Прочитать все"
        >
          <CheckCheck size={20} color="#5B4FE2" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5B4FE2" />
        </View>
      ) : items.length === 0 ? (
        <View className="px-4 pt-10">
          <EmptyState
            icon={<Bell size={32} color="#9CA1A8" />}
            title="Пока ничего нового"
            description="Здесь появятся события из задач, заявок и команды"
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-2"
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                const route = mapLinkToMobileRoute(item.link);
                if (route) router.push(route as never);
              }}
            >
              <Card
                padding="md"
                className={item.readAt ? "" : "border-primary-300 bg-primary-50/30"}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-md ${item.readAt ? "bg-muted" : "bg-primary-500"}`}
                  >
                    <Bell size={16} color={item.readAt ? "#6B7080" : "#FFFFFF"} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-bold">{item.title}</Text>
                    {item.body ? (
                      <Text className="text-muted-foreground mt-0.5 text-sm">{item.body}</Text>
                    ) : null}
                    <Text className="text-muted-foreground mt-1 text-xs">
                      {TYPE_LABEL[item.type] ?? item.type} ·{" "}
                      {new Date(item.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
