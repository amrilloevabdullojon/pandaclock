import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Plus, X } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, Input, Screen, Skeleton } from "@/components/ui";

type LeaveType = "VACATION" | "SICK" | "TIME_OFF" | "OTHER";
type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface LeaveRow {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: Status;
  reason: string | null;
}

const TYPES: { value: LeaveType; label: string; emoji: string }[] = [
  { value: "VACATION", label: "Отпуск", emoji: "✈️" },
  { value: "SICK", label: "Больничный", emoji: "🤒" },
  { value: "TIME_OFF", label: "Отгул", emoji: "🎂" },
  { value: "OTHER", label: "Другое", emoji: "📝" },
];

export default function RequestsScreen() {
  const [items, setItems] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<LeaveRow[]>("/requests?scope=my");
      setItems(data);
    } catch {
      setItems([]);
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
    <Screen background="default" edges={["top"]} padded={false}>
      {/* === Header === */}
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <View className="flex-1">
          <Text className="text-foreground text-2xl font-extrabold">Заявки</Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            {items.length === 0
              ? "Нет заявок"
              : items.length === 1
                ? "1 заявка"
                : items.length < 5
                  ? `${items.length} заявки`
                  : `${items.length} заявок`}
          </Text>
        </View>
        <Button
          size="sm"
          leftIcon={<Plus size={16} color="#fff" />}
          onPress={() => setModalOpen(true)}
        >
          Создать
        </Button>
      </View>

      {loading ? (
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </View>
      ) : items.length === 0 ? (
        <View className="px-5 pt-6">
          <EmptyState
            emoji="📋"
            title="У вас пока нет заявок"
            description="Нажмите «Создать», чтобы запросить отпуск, больничный или отгул."
            action={
              <Button onPress={() => setModalOpen(true)} leftIcon={<Plus size={16} color="#fff" />}>
                Создать заявку
              </Button>
            }
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-6 gap-3"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B4FE2" />
          }
          renderItem={({ item }) => <RequestCard request={item} />}
        />
      )}

      <CreateRequestModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </Screen>
  );
}

function RequestCard({ request }: { request: LeaveRow }) {
  const typeInfo = TYPES.find((t) => t.value === request.type);
  return (
    <Card padding="md">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-2xl">{typeInfo?.emoji ?? "📝"}</Text>
          <View className="flex-1">
            <Text className="text-foreground text-base font-bold">
              {typeInfo?.label ?? "Заявка"}
            </Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {formatDate(request.startDate)} — {formatDate(request.endDate)} · {request.daysCount}{" "}
              р. дн.
            </Text>
          </View>
        </View>
        <StatusBadge status={request.status} />
      </View>
      {request.reason ? (
        <View className="border-border mt-3 border-t pt-3">
          <Text className="text-foreground text-sm">{request.reason}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<
    Status,
    { variant: "warning" | "success" | "danger" | "secondary"; label: string }
  > = {
    PENDING: { variant: "warning", label: "Ждёт решения" },
    APPROVED: { variant: "success", label: "Утверждена" },
    REJECTED: { variant: "danger", label: "Отклонена" },
    CANCELLED: { variant: "secondary", label: "Отменена" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} size="sm" dot>
      {cfg.label}
    </Badge>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function CreateRequestModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<LeaveType>("VACATION");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});

  async function submit() {
    const newErrors: typeof errors = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) newErrors.start = "Формат: YYYY-MM-DD";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) newErrors.end = "Формат: YYYY-MM-DD";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setPending(true);
    try {
      await api("/requests", {
        method: "POST",
        body: { type, startDate: start, endDate: end, reason: reason || undefined },
      });
      onCreated();
      setStart("");
      setEnd("");
      setReason("");
    } catch {
      Alert.alert("Не удалось отправить заявку", "Попробуйте позже");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="bg-background flex-1 dark:bg-neutral-900">
        {/* === Modal header === */}
        <View className="border-border flex-row items-center justify-between border-b px-5 py-4 dark:border-neutral-700">
          <Pressable onPress={onClose} accessibilityLabel="Закрыть" hitSlop={8}>
            <X size={22} color="#6B7080" />
          </Pressable>
          <Text className="text-foreground text-base font-bold">Новая заявка</Text>
          <Pressable onPress={submit} disabled={pending} hitSlop={8}>
            <Text
              className={`text-sm font-bold ${
                pending ? "text-muted-foreground" : "text-primary-500"
              }`}
            >
              {pending ? "..." : "Отправить"}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          {/* === Type picker === */}
          <Text className="text-foreground mb-2 text-sm font-semibold">Тип заявки</Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {TYPES.map((option) => {
              const active = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 active:opacity-70 ${
                    active
                      ? "bg-primary-500"
                      : "border-border bg-card border dark:border-neutral-700 dark:bg-neutral-800"
                  }`}
                >
                  <Text className="text-base">{option.emoji}</Text>
                  <Text
                    className={`text-sm font-bold ${
                      active ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* === Dates === */}
          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Дата начала"
                value={start}
                onChangeText={(v) => {
                  setStart(v);
                  setErrors((e) => ({ ...e, start: undefined }));
                }}
                placeholder="2026-06-01"
                error={errors.start}
                required
              />
            </View>
            <View className="flex-1">
              <Input
                label="Дата окончания"
                value={end}
                onChangeText={(v) => {
                  setEnd(v);
                  setErrors((e) => ({ ...e, end: undefined }));
                }}
                placeholder="2026-06-05"
                error={errors.end}
                required
              />
            </View>
          </View>

          {/* === Reason === */}
          <Input
            label="Причина"
            value={reason}
            onChangeText={setReason}
            placeholder="Опишите причину (опционально)"
            multiline
            numberOfLines={4}
            hint="HR увидит это сообщение"
            className="min-h-24"
          />

          <View className="mt-6">
            <Button
              fullWidth
              size="lg"
              onPress={submit}
              loading={pending}
              loadingText="Отправляем…"
            >
              Отправить заявку
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
