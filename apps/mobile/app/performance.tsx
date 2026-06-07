import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Minus, Plus, Star, Target } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Card, EmptyState, Screen } from "@/components/ui";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  dueDate: string | null;
}
interface Review {
  id: string;
  periodLabel: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "В работе",
  DONE: "Достигнута",
  CANCELLED: "Отменена",
};

export default function PerformanceScreen() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [g, r] = await Promise.all([
        api<Goal[]>("/performance/goals/my"),
        api<Review[]>("/performance/reviews/my"),
      ]);
      setGoals(g);
      setReviews(r);
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

  async function changeProgress(goal: Goal, delta: number) {
    const next = Math.max(0, Math.min(100, goal.progress + delta));
    if (next === goal.progress) return;
    // Оптимистично
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, progress: next, status: next >= 100 ? "DONE" : "ACTIVE" } : g,
      ),
    );
    try {
      await api(`/performance/goals/${goal.id}/progress`, {
        method: "PATCH",
        body: { progress: next },
      });
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
          <Text className="text-foreground text-lg font-extrabold">Цели и оценки</Text>
          <Text className="text-muted-foreground text-xs">Мой прогресс и обратная связь</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<Target size={40} color="#9CA3AF" />}
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
          {/* Цели */}
          <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
            Мои цели
          </Text>
          {goals.length === 0 ? (
            <Card className="mb-5" padding="md">
              <Text className="text-muted-foreground text-sm">Целей пока нет.</Text>
            </Card>
          ) : (
            goals.map((g) => (
              <Card key={g.id} className="mb-2" padding="md">
                <Text className="text-foreground font-bold">{g.title}</Text>
                {g.description ? (
                  <Text className="text-muted-foreground mt-0.5 text-sm">{g.description}</Text>
                ) : null}
                <View className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                  <View
                    className={`h-full rounded-full ${g.status === "DONE" ? "bg-success" : "bg-primary-500"}`}
                    style={{ width: `${g.progress}%` }}
                  />
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-muted-foreground text-xs">
                    {STATUS_LABEL[g.status] ?? g.status} · {g.progress}%
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => changeProgress(g, -10)}
                      className="border-border h-8 w-8 items-center justify-center rounded-full border"
                      accessibilityLabel="Уменьшить прогресс"
                    >
                      <Minus size={16} color="#5B4FE2" />
                    </Pressable>
                    <Pressable
                      onPress={() => changeProgress(g, 10)}
                      className="bg-primary-500 h-8 w-8 items-center justify-center rounded-full"
                      accessibilityLabel="Увеличить прогресс"
                    >
                      <Plus size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}

          {/* Оценки */}
          <Text className="text-muted-foreground mb-2 mt-4 px-1 text-xs font-bold uppercase tracking-wider">
            Мои оценки
          </Text>
          {reviews.length === 0 ? (
            <Card padding="md">
              <Text className="text-muted-foreground text-sm">Оценок пока нет.</Text>
            </Card>
          ) : (
            reviews.map((r) => (
              <Card key={r.id} className="mb-2" padding="md">
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground font-bold">{r.periodLabel}</Text>
                  <View className="flex-row gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        color={i < r.rating ? "#F4B942" : "#D1D5DB"}
                        fill={i < r.rating ? "#F4B942" : "none"}
                      />
                    ))}
                  </View>
                </View>
                {r.comment ? (
                  <Text className="text-muted-foreground mt-1 text-sm">{r.comment}</Text>
                ) : null}
                {r.reviewerName ? (
                  <Text className="text-muted-foreground mt-1 text-[11px]">
                    Оценил: {r.reviewerName}
                  </Text>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
