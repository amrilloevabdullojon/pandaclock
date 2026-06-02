import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { api } from "@/lib/api-client";
import { TaskComments } from "@/components/task-comments";
import { TaskAttachments } from "@/components/task-attachments";

type Status = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeName: string | null;
  createdByName: string;
  deadline: string | null;
  labels: string[];
}

const TRANSITIONS: Record<Status, { status: Status; label: string }[]> = {
  NEW: [
    { status: "IN_PROGRESS", label: "Взять в работу" },
    { status: "REJECTED", label: "Отклонить" },
  ],
  IN_PROGRESS: [
    { status: "DONE", label: "✓ Готово" },
    { status: "REJECTED", label: "Отклонить" },
  ],
  DONE: [{ status: "IN_PROGRESS", label: "Открыть заново" }],
  REJECTED: [{ status: "IN_PROGRESS", label: "Восстановить" }],
};

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const taskId = params.id;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Status | null>(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    try {
      const [data, me] = await Promise.all([
        api<TaskDetail>(`/tasks/${taskId}`),
        api<{ id: string }>("/auth/me").catch(() => null),
      ]);
      setTask(data);
      setMeId(me?.id ?? null);
    } catch {
      Alert.alert("Не удалось загрузить задачу");
    }
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function transition(to: Status) {
    if (!taskId) return;
    setPending(to);
    try {
      const updated = await api<TaskDetail>(`/tasks/${taskId}`, {
        method: "PATCH",
        body: { status: to },
      });
      setTask(updated);
    } catch {
      Alert.alert("Не удалось сменить статус");
    } finally {
      setPending(null);
    }
  }

  if (loading || !task) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator color="#5B4FE2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <Stack.Screen options={{ headerShown: true, title: "Задача", headerBackTitle: "Назад" }} />
      <ScrollView className="flex-1 px-6 py-4">
        <View className="mb-2 flex-row flex-wrap gap-2">
          <Text className="rounded-pill bg-primary-100 text-primary-700 px-2 py-0.5 text-xs font-semibold">
            {task.priority}
          </Text>
          <Text className="rounded-pill bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
            {task.status}
          </Text>
        </View>

        <Text className="text-2xl font-extrabold text-neutral-900">{task.title}</Text>

        {task.deadline ? (
          <Text className="mt-2 text-sm text-neutral-500">
            📅 Дедлайн: {new Date(task.deadline).toLocaleString("ru-RU")}
          </Text>
        ) : null}

        <Text className="mt-1 text-sm text-neutral-500">
          {task.assigneeName ? `Исполнитель: ${task.assigneeName}` : "Без исполнителя"}
        </Text>
        <Text className="text-sm text-neutral-500">Создал: {task.createdByName}</Text>

        {task.description ? (
          <View className="mt-4 rounded-lg bg-white p-4">
            <Text className="text-sm text-neutral-700">{task.description}</Text>
          </View>
        ) : null}

        <View className="mt-6 space-y-2">
          {TRANSITIONS[task.status].map((action) => (
            <Pressable
              key={action.status}
              onPress={() => transition(action.status)}
              disabled={pending !== null}
              className={`rounded-md py-4 ${
                action.status === "DONE"
                  ? "bg-success active:bg-success/80"
                  : action.status === "REJECTED"
                    ? "bg-danger active:bg-danger/80"
                    : "bg-primary-500 active:bg-primary-600"
              } disabled:opacity-60`}
            >
              {pending === action.status ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-bold text-white">{action.label}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Attachments */}
        <View className="mt-8">
          <TaskAttachments taskId={task.id} meId={meId} />
        </View>

        {/* Comments */}
        <View className="mt-8">
          <TaskComments taskId={task.id} meId={meId} />
        </View>

        <Pressable onPress={() => router.back()} className="mt-6 py-3">
          <Text className="text-center text-sm text-neutral-500">← Назад</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
