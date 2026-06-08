import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Laptop } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, Card, EmptyState, Screen } from "@/components/ui";

interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  LAPTOP: "Ноутбук",
  PHONE: "Телефон",
  MONITOR: "Монитор",
  PERIPHERAL: "Периферия",
  FURNITURE: "Мебель",
  VEHICLE: "Транспорт",
  OTHER: "Прочее",
};

export default function AssetsScreen() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setAssets(await api<Asset[]>("/assets/my"));
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
          <Text className="text-foreground text-lg font-extrabold">Активы</Text>
          <Text className="text-muted-foreground text-xs">Закреплённое за мной оборудование</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B4FE2" />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<Laptop size={40} color="#9CA3AF" />}
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
          {assets.length === 0 ? (
            <EmptyState
              icon={<Laptop size={40} color="#9CA3AF" />}
              title="Активов нет"
              description="За вами не закреплено оборудование."
            />
          ) : (
            assets.map((a) => (
              <Card key={a.id} className="mb-2" padding="md">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-foreground flex-1 text-base font-bold">{a.name}</Text>
                  <Badge variant="secondary">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
                </View>
                {a.serialNumber ? (
                  <Text className="text-muted-foreground mt-1 text-xs">S/N: {a.serialNumber}</Text>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
