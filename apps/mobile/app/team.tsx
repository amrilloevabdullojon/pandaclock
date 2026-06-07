import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Clock, TrendingUp, UserCheck, Plane } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Card, EmptyState, Screen } from "@/components/ui";

interface OverviewDailyPoint {
  date: string;
  present: number;
  late: number;
  onLeave: number;
}
interface OverviewDepartment {
  department: string;
  totalHours: number;
  lateRate: number;
  headcount: number;
}
interface OverviewResponse {
  period: { start: string; end: string; label?: string };
  daily: OverviewDailyPoint[];
  byDepartment: OverviewDepartment[];
  summary: {
    totalHours: number;
    avgPresentPerDay: number;
    lateRate: number;
    leaveDays: number;
  };
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <Card className="flex-1" padding="md">
      <View className={`mb-2 h-9 w-9 items-center justify-center rounded-full ${tint}`}>
        {icon}
      </View>
      <Text className="text-foreground text-xl font-extrabold">{value}</Text>
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </Card>
  );
}

const WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()}`;
}

/**
 * Экран «Команда» — сводная аналитика посещаемости за период для
 * руководителя/HR. Переиспользует API /reports/overview (тот же источник,
 * что и графики в web-дашборде).
 */
export default function TeamScreen() {
  const [data, setData] = React.useState<OverviewResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await api<OverviewResponse>("/reports/overview");
      setData(res);
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

  const last7 = React.useMemo(() => (data ? data.daily.slice(-7) : []), [data]);
  const maxPresent = React.useMemo(() => Math.max(1, ...last7.map((d) => d.present)), [last7]);

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="border-border flex-row items-center gap-3 border-b px-5 pb-3 pt-1">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Назад">
          <ArrowLeft size={24} color="#5B4FE2" />
        </Pressable>
        <View>
          <Text className="text-foreground text-lg font-extrabold">Команда</Text>
          <Text className="text-muted-foreground text-xs">Посещаемость за период</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error || !data ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<TrendingUp size={40} color="#9CA3AF" />}
            title="Не удалось загрузить"
            description="Проверьте соединение и потяните вниз для обновления."
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
          {/* Summary */}
          <View className="mb-3 flex-row gap-3">
            <StatCard
              icon={<Clock size={18} color="#5B4FE2" />}
              label="Всего часов"
              value={`${data.summary.totalHours}`}
              tint="bg-primary-100"
            />
            <StatCard
              icon={<UserCheck size={18} color="#22A06B" />}
              label="В среднем в день"
              value={`${data.summary.avgPresentPerDay}`}
              tint="bg-success-light"
            />
          </View>
          <View className="mb-5 flex-row gap-3">
            <StatCard
              icon={<TrendingUp size={18} color="#ED7280" />}
              label="Опоздания"
              value={`${data.summary.lateRate}%`}
              tint="bg-danger-light"
            />
            <StatCard
              icon={<Plane size={18} color="#E8A23D" />}
              label="Дней отпуска"
              value={`${data.summary.leaveDays}`}
              tint="bg-warning-light"
            />
          </View>

          {/* Последние 7 дней — простые бары присутствия */}
          <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
            Последние дни
          </Text>
          <Card className="mb-5" padding="md">
            {last7.length === 0 ? (
              <Text className="text-muted-foreground text-sm">Нет данных за период</Text>
            ) : (
              last7.map((d, i) => (
                <View
                  key={d.date}
                  className={`flex-row items-center gap-3 ${i < last7.length - 1 ? "mb-2" : ""}`}
                >
                  <Text className="text-muted-foreground w-12 text-xs">{dayLabel(d.date)}</Text>
                  <View className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
                    <View
                      className="bg-primary-500 h-full rounded-full"
                      style={{ width: `${Math.round((d.present / maxPresent) * 100)}%` }}
                    />
                  </View>
                  <Text className="text-foreground w-7 text-right text-xs font-semibold">
                    {d.present}
                  </Text>
                  {d.late > 0 ? (
                    <Text className="text-danger w-12 text-right text-[11px]">{d.late} опозд.</Text>
                  ) : (
                    <View className="w-12" />
                  )}
                </View>
              ))
            )}
          </Card>

          {/* По отделам */}
          <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
            По отделам
          </Text>
          <Card padding="none" className="mb-8 overflow-hidden">
            {data.byDepartment.length === 0 ? (
              <View className="p-4">
                <Text className="text-muted-foreground text-sm">Нет данных</Text>
              </View>
            ) : (
              data.byDepartment.map((dep, i) => (
                <View
                  key={dep.department}
                  className={`flex-row items-center justify-between p-4 ${i > 0 ? "border-border border-t" : ""}`}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-foreground font-semibold" numberOfLines={1}>
                      {dep.department}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      {dep.headcount} чел. · {dep.lateRate}% опозданий
                    </Text>
                  </View>
                  <Text className="text-foreground font-extrabold">{dep.totalHours} ч</Text>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}
