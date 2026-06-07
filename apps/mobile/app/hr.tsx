import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, CheckCircle2, Circle, FileCheck, FileText } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Card, EmptyState, Screen } from "@/components/ui";

interface ChecklistItem {
  id: string;
  kind: string;
  title: string;
  done: boolean;
}
interface MyDoc {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
}

export default function HrScreen() {
  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const [docs, setDocs] = React.useState<MyDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [it, dc] = await Promise.all([
        api<ChecklistItem[]>("/hr/onboarding/my"),
        api<MyDoc[]>("/hr/documents/my"),
      ]);
      setItems(it);
      setDocs(dc);
      setError(false);
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

  async function toggle(item: ChecklistItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    try {
      await api(`/hr/onboarding/${item.id}`, { method: "PATCH", body: { done: !item.done } });
    } catch {
      void load();
    }
  }

  async function acknowledge(doc: MyDoc) {
    setDocs((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, acknowledgedAt: new Date().toISOString() } : d)),
    );
    try {
      await api(`/hr/documents/${doc.id}/ack`, { method: "POST" });
    } catch {
      void load();
    }
  }

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="border-border flex-row items-center gap-3 border-b px-5 pb-3 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Назад">
          <ArrowLeft size={24} color="#5B4FE2" />
        </Pressable>
        <View>
          <Text className="text-foreground text-lg font-extrabold">Кадры</Text>
          <Text className="text-muted-foreground text-xs">Адаптация и документы</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<FileText size={40} color="#9CA3AF" />}
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
          {/* Адаптация */}
          {items.length > 0 ? (
            <>
              <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
                Мой чек-лист
              </Text>
              <Card className="mb-5" padding="none">
                {items.map((i, idx) => (
                  <Pressable
                    key={i.id}
                    onPress={() => toggle(i)}
                    className={`flex-row items-center gap-3 p-3 ${idx > 0 ? "border-border border-t" : ""}`}
                  >
                    {i.done ? (
                      <CheckCircle2 size={20} color="#22A06B" />
                    ) : (
                      <Circle size={20} color="#9CA3AF" />
                    )}
                    <Text
                      className={`flex-1 text-sm ${i.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {i.title}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            </>
          ) : null}

          {/* Документы */}
          <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
            Документы на ознакомление
          </Text>
          {docs.length === 0 ? (
            <Card padding="md">
              <Text className="text-muted-foreground text-sm">Документов нет.</Text>
            </Card>
          ) : (
            docs.map((d) => (
              <Card key={d.id} className="mb-2" padding="md">
                <Text className="text-foreground font-bold">{d.title}</Text>
                {d.body ? (
                  <Text className="text-muted-foreground mt-1 text-sm">{d.body}</Text>
                ) : null}
                {d.acknowledgedAt ? (
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <FileCheck size={16} color="#22A06B" />
                    <Text className="text-success text-xs font-semibold">Ознакомлен(а)</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => acknowledge(d)}
                    className="bg-primary-500 mt-3 items-center rounded-lg py-2.5"
                  >
                    <Text className="font-bold text-white">Подтвердить ознакомление</Text>
                  </Pressable>
                )}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
