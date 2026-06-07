import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, CalendarClock, Clock } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Card, EmptyState, Screen } from "@/components/ui";

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatDate(iso: string): { weekday: string; label: string; isToday: boolean } {
  const d = new Date(`${iso}T00:00:00`);
  const today = isoDate(new Date());
  return {
    weekday: WEEKDAY[d.getDay()] ?? "",
    label: `${d.getDate()} ${MONTH[d.getMonth()] ?? ""}`,
    isToday: iso === today,
  };
}

/** Экран «Мои смены» — ближайшие 4 недели графика текущего пользователя. */
export default function MyShiftsScreen() {
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const start = isoDate(new Date());
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 28);
      const res = await api<Shift[]>(`/shifts/my?start=${start}&end=${isoDate(endDate)}`);
      setShifts(res);
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

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="border-border flex-row items-center gap-3 border-b px-5 pb-3 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Назад">
          <ArrowLeft size={24} color="#5B4FE2" />
        </Pressable>
        <View>
          <Text className="text-foreground text-lg font-extrabold">Мои смены</Text>
          <Text className="text-muted-foreground text-xs">График на ближайшие 4 недели</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<CalendarClock size={40} color="#9CA3AF" />}
            title="Не удалось загрузить"
            description="Проверьте соединение и потяните вниз."
          />
        </View>
      ) : shifts.length === 0 ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<CalendarClock size={40} color="#9CA3AF" />}
            title="Смен пока нет"
            description="Когда руководитель назначит вам смену, она появится здесь."
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
          {shifts.map((s) => {
            const f = formatDate(s.date);
            return (
              <Card key={s.id} className="mb-2 flex-row items-center gap-3" padding="md">
                <View
                  className={`h-12 w-12 items-center justify-center rounded-xl ${f.isToday ? "bg-primary-500" : "bg-primary-100"}`}
                >
                  <Text
                    className={`text-[10px] font-bold ${f.isToday ? "text-white" : "text-primary-700"}`}
                  >
                    {f.weekday}
                  </Text>
                  <Text
                    className={`text-sm font-extrabold ${f.isToday ? "text-white" : "text-primary-700"}`}
                  >
                    {s.date.slice(8, 10)}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="#5B4FE2" />
                    <Text className="text-foreground font-bold">
                      {s.startTime}–{s.endTime}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground text-xs">{f.label}</Text>
                  {s.note ? (
                    <Text className="text-muted-foreground mt-0.5 text-xs italic">{s.note}</Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
