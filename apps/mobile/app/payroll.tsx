import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Wallet } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, Card, EmptyState, Screen } from "@/components/ui";

interface MyPayslip {
  id: string;
  period: string;
  status: string;
  baseAmount: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  currency: string;
  note: string | null;
  paidAt: string | null;
}

const STATUS: Record<string, { label: string; variant: "info" | "success" }> = {
  APPROVED: { label: "Утверждён", variant: "info" },
  PAID: { label: "Выплачен", variant: "success" },
};

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${currency}`;
}

export default function PayrollScreen() {
  const [slips, setSlips] = React.useState<MyPayslip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setSlips(await api<MyPayslip[]>("/payroll/payslips/my"));
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
          <Text className="text-foreground text-lg font-extrabold">Зарплата</Text>
          <Text className="text-muted-foreground text-xs">Мои расчётные листки</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<Wallet size={40} color="#9CA3AF" />}
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
          {slips.length === 0 ? (
            <EmptyState
              icon={<Wallet size={40} color="#9CA3AF" />}
              title="Листков пока нет"
              description="Расчётные листки появятся после начисления зарплаты."
            />
          ) : (
            slips.map((s) => {
              const st = STATUS[s.status];
              return (
                <Card key={s.id} className="mb-3" padding="md">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-foreground text-base font-bold">{s.period}</Text>
                    {st ? <Badge variant={st.variant}>{st.label}</Badge> : null}
                  </View>
                  <View className="mt-3 gap-1.5">
                    <Row label="Оклад" value={money(s.baseAmount, s.currency)} />
                    <Row label="Премия" value={money(s.bonus, s.currency)} />
                    <Row label="Удержания" value={money(s.deductions, s.currency)} />
                    <View className="border-border mt-1 border-t pt-1.5">
                      <Row label="К выплате" value={money(s.netAmount, s.currency)} strong />
                    </View>
                  </View>
                  {s.note ? (
                    <Text className="text-muted-foreground mt-2 text-xs">{s.note}</Text>
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className={strong ? "text-foreground text-base font-bold" : "text-foreground text-sm"}>
        {value}
      </Text>
    </View>
  );
}
