import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { Calendar, MessageCircle } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, EmptyState, Screen, Skeleton } from "@/components/ui";

type Scope = "today" | "my" | "overdue";

type TaskStatus = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
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
    <Screen background="default" edges={["top"]} padded={false}>
      {/* === Header === */}
      <View className="px-5 pb-4 pt-4">
        <Text className="text-foreground text-2xl font-extrabold">Задачи</Text>
        <Text className="text-muted-foreground mt-1 text-sm">
          {tasks.length === 0
            ? "Нет задач в этой вкладке"
            : tasks.length === 1
              ? "1 задача"
              : tasks.length < 5
                ? `${tasks.length} задачи`
                : `${tasks.length} задач`}
        </Text>
      </View>

      {/* === Tabs === */}
      <View className="px-5 pb-3">
        <View className="flex-row gap-2">
          {TABS.map((tab) => {
            const isActive = scope === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setScope(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                className={`rounded-full px-4 py-2 active:opacity-80 ${
                  isActive ? "bg-primary-500" : "bg-card border-border border"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isActive ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </View>
      ) : tasks.length === 0 ? (
        <View className="px-5 pt-6">
          <EmptyState
            emoji="🎯"
            title="Всё закрыто!"
            description="В этой вкладке нет задач. Откройте другую вкладку или попросите менеджера назначить новую."
          />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-6 gap-3"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B4FE2" />
          }
          renderItem={({ item }) => <TaskCard task={item} />}
        />
      )}
    </Screen>
  );
}

function TaskCard({ task }: { task: TaskRow }) {
  const priorityBar = priorityBarColor(task.priority);
  const overdue =
    task.deadline && new Date(task.deadline).getTime() < Date.now() && task.status !== "DONE";

  return (
    <Pressable
      onPress={() => router.push(`/tasks/${task.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Задача ${task.title}`}
      className="bg-card flex-row overflow-hidden rounded-md shadow-sm active:opacity-80"
    >
      {/* Цветная полоса слева по приоритету */}
      <View className={`w-1 ${priorityBar}`} />

      <View className="flex-1 gap-2 p-4">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-foreground flex-1 text-base font-bold" numberOfLines={2}>
            {task.title}
          </Text>
          <StatusBadge status={task.status} />
        </View>

        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <PriorityBadge priority={task.priority} />
          {task.assigneeName ? (
            <Text className="text-muted-foreground text-xs">{task.assigneeName}</Text>
          ) : null}
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          {task.deadline ? (
            <View className="flex-row items-center gap-1">
              <Calendar size={12} color={overdue ? "#ED7280" : "#6B7080"} />
              <Text
                className={`text-xs font-semibold ${
                  overdue ? "text-danger" : "text-muted-foreground"
                }`}
              >
                {new Date(task.deadline).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {overdue ? " · просрочено" : ""}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {task.commentsCount > 0 ? (
            <View className="flex-row items-center gap-1">
              <MessageCircle size={12} color="#6B7080" />
              <Text className="text-muted-foreground text-xs">{task.commentsCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function priorityBarColor(priority: TaskPriority): string {
  switch (priority) {
    case "URGENT":
      return "bg-danger";
    case "HIGH":
      return "bg-warning";
    case "MEDIUM":
      return "bg-info";
    case "LOW":
      return "bg-neutral-200";
  }
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<
    TaskStatus,
    { variant: "secondary" | "warning" | "success" | "danger"; label: string }
  > = {
    NEW: { variant: "secondary", label: "Новая" },
    IN_PROGRESS: { variant: "warning", label: "В работе" },
    DONE: { variant: "success", label: "Готово" },
    REJECTED: { variant: "danger", label: "Отклонена" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} size="sm" dot>
      {cfg.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const map: Record<
    TaskPriority,
    { variant: "secondary" | "info" | "warning" | "danger"; label: string }
  > = {
    LOW: { variant: "secondary", label: "Низкий" },
    MEDIUM: { variant: "info", label: "Средний" },
    HIGH: { variant: "warning", label: "Высокий" },
    URGENT: { variant: "danger", label: "🔥 Срочно" },
  };
  const cfg = map[priority];
  return (
    <Badge variant={cfg.variant} size="sm">
      {cfg.label}
    </Badge>
  );
}
