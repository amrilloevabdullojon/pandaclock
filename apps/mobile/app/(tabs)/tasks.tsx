import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api-client";

type Scope = "today" | "my" | "overdue";

interface TaskRow {
  id: string;
  title: string;
  status: "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadline: string | null;
  assigneeName: string | null;
  commentsCount: number;
}

const TABS: { id: Scope; label: string }[] = [
  { id: "today", label: "На сегодня" },
  { id: "my", label: "Все мои" },
  { id: "overdue", label: "Просрочены" },
];

export default function TasksScreen() {
  const [scope, setScope] = useState<Scope>("today");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (target: Scope) => {
    try {
      const data = await api<TaskRow[]>(`/tasks?scope=${target}`);
      setTasks(data);
    } catch {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(scope).finally(() => setLoading(false));
  }, [scope, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(scope);
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="px-6 pt-6">
        <Text className="text-2xl font-extrabold text-neutral-900">Задачи</Text>

        <View className="mt-4 flex-row gap-2">
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setScope(tab.id)}
              className={`rounded-pill px-4 py-2 ${
                scope === tab.id ? "bg-primary-500" : "bg-white border border-neutral-200"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  scope === tab.id ? "text-white" : "text-neutral-700"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
          {tasks.length === 0 ? (
            <View className="items-center pt-20">
              <Text className="text-5xl">🐼</Text>
              <Text className="mt-4 text-center text-sm text-neutral-500">
                Здесь пусто. Все задачи завершены или вам ничего не назначено.
              </Text>
            </View>
          ) : (
            tasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => router.push(`/tasks/${task.id}`)}
                className="mb-3 rounded-lg bg-white p-4 shadow-sm active:bg-neutral-50"
              >
                <View className="flex-row items-center justify-between">
                  <PriorityChip priority={task.priority} />
                  <StatusChip status={task.status} />
                </View>
                <Text className="mt-2 text-base font-semibold text-neutral-900">{task.title}</Text>
                {task.deadline ? (
                  <Text className="mt-1 text-xs text-neutral-500">
                    📅 {new Date(task.deadline).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PriorityChip({ priority }: { priority: TaskRow["priority"] }) {
  const map = {
    LOW: { className: "bg-neutral-100 text-neutral-600", label: "Низкий" },
    MEDIUM: { className: "bg-info-light text-info", label: "Средний" },
    HIGH: { className: "bg-warning-light text-warning", label: "Высокий" },
    URGENT: { className: "bg-danger-light text-danger", label: "🔥 Срочно" },
  };
  const cfg = map[priority];
  return (
    <Text className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </Text>
  );
}

function StatusChip({ status }: { status: TaskRow["status"] }) {
  const map = {
    NEW: { className: "bg-primary-100 text-primary-700", label: "Новая" },
    IN_PROGRESS: { className: "bg-warning-light text-warning", label: "В работе" },
    DONE: { className: "bg-success-light text-success", label: "Готово" },
    REJECTED: { className: "bg-danger-light text-danger", label: "Отклонена" },
  };
  const cfg = map[status];
  return (
    <Text className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </Text>
  );
}
