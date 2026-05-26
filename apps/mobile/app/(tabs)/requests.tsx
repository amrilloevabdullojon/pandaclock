import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { api } from "@/lib/api-client";

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

const TYPES: { value: LeaveType; label: string }[] = [
  { value: "VACATION", label: "✈️ Отпуск" },
  { value: "SICK", label: "🤒 Больничный" },
  { value: "TIME_OFF", label: "🎂 Отгул" },
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
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-row items-center justify-between px-6 pt-6">
        <Text className="text-2xl font-extrabold text-neutral-900">Заявки</Text>
        <Pressable
          onPress={() => setModalOpen(true)}
          className="rounded-md bg-primary-500 px-4 py-2 active:bg-primary-600"
        >
          <Text className="text-sm font-bold text-white">+ Создать</Text>
        </Pressable>
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
          {items.length === 0 ? (
            <View className="items-center pt-16">
              <Text className="text-5xl">🐼</Text>
              <Text className="mt-4 text-center text-sm text-neutral-500">
                У вас пока нет заявок. Нажмите «Создать», чтобы запросить отпуск или отгул.
              </Text>
            </View>
          ) : (
            items.map((req) => (
              <View key={req.id} className="mb-3 rounded-lg bg-white p-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-neutral-900">
                    {typeLabel(req.type)}
                  </Text>
                  <StatusChip status={req.status} />
                </View>
                <Text className="mt-1 text-sm text-neutral-500">
                  {req.startDate} — {req.endDate} ({req.daysCount} р. дней)
                </Text>
                {req.reason ? (
                  <Text className="mt-2 text-sm text-neutral-700">{req.reason}</Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <CreateRequestModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </SafeAreaView>
  );
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

  async function submit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      Alert.alert("Введите даты в формате YYYY-MM-DD");
      return;
    }
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
      Alert.alert("Не удалось отправить заявку");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View className="flex-row items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Pressable onPress={onClose}>
            <Text className="text-sm text-neutral-500">Отмена</Text>
          </Pressable>
          <Text className="text-base font-bold text-neutral-900">Новая заявка</Text>
          <Pressable onPress={submit} disabled={pending}>
            <Text className="text-sm font-bold text-primary-500">
              {pending ? "..." : "Отправить"}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          <Text className="mb-2 text-sm font-semibold text-neutral-700">Тип</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {TYPES.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setType(option.value)}
                className={`rounded-pill px-3 py-2 ${
                  type === option.value ? "bg-primary-500" : "border border-neutral-200 bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    type === option.value ? "text-white" : "text-neutral-700"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-2 text-sm font-semibold text-neutral-700">С (YYYY-MM-DD)</Text>
          <TextInput
            value={start}
            onChangeText={setStart}
            placeholder="2026-06-01"
            className="mb-4 rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          />

          <Text className="mb-2 text-sm font-semibold text-neutral-700">По (YYYY-MM-DD)</Text>
          <TextInput
            value={end}
            onChangeText={setEnd}
            placeholder="2026-06-05"
            className="mb-4 rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          />

          <Text className="mb-2 text-sm font-semibold text-neutral-700">Причина (опционально)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map = {
    PENDING: { className: "bg-warning-light text-warning", label: "Ждёт" },
    APPROVED: { className: "bg-success-light text-success", label: "Утв." },
    REJECTED: { className: "bg-danger-light text-danger", label: "Откл." },
    CANCELLED: { className: "bg-neutral-100 text-neutral-500", label: "Отм." },
  };
  const cfg = map[status];
  return (
    <Text className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </Text>
  );
}

function typeLabel(type: LeaveType): string {
  return type === "VACATION"
    ? "✈️ Отпуск"
    : type === "SICK"
      ? "🤒 Больничный"
      : type === "TIME_OFF"
        ? "🎂 Отгул"
        : "📝 Другое";
}
