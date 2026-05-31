import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  type LucideIcon,
  Sparkles,
  Users,
  X,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui";

interface Step {
  key: "departments" | "employees" | "tasks" | "time";
  done: boolean;
}

interface OnboardingResponse {
  steps: Step[];
  completedCount: number;
  totalCount: number;
  dismissedAt: string | null;
}

const STEP_CONFIG: Record<Step["key"], { title: string; route: string; icon: LucideIcon }> = {
  departments: { title: "Добавить отдел", route: "/(tabs)/profile", icon: Building2 },
  employees: { title: "Пригласить коллегу", route: "/(tabs)/profile", icon: Users },
  tasks: { title: "Создать задачу", route: "/(tabs)/tasks", icon: CheckCircle2 },
  time: { title: "Отметить приход", route: "/(tabs)/home", icon: Clock },
};

/**
 * Карточка прогресса онбординга — показывается на Home если есть незавершённые
 * шаги. Серверный статус кэшируется, при первом рендере загружается, потом
 * можно скрыть навсегда (POST /onboarding/dismiss).
 */
export function OnboardingCard() {
  const [data, setData] = React.useState<OnboardingResponse | null>(null);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    api<OnboardingResponse>("/onboarding/status")
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || hidden || data.dismissedAt) return null;
  if (data.completedCount === data.totalCount) return null;

  async function dismiss() {
    setHidden(true);
    try {
      await api("/onboarding/dismiss", { method: "POST" });
    } catch {
      // ничего — UI уже скрыли локально
    }
  }

  const percent = Math.round((data.completedCount / data.totalCount) * 100);

  return (
    <Card padding="md" className="border-primary-200 bg-primary-50/40 mb-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start gap-2">
          <View className="bg-primary-500 h-9 w-9 items-center justify-center rounded-md">
            <Sparkles size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-foreground text-base font-extrabold">Настройка Pandaclock</Text>
            <Text className="text-muted-foreground text-xs">
              {data.completedCount} из {data.totalCount} шагов · {percent}%
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => void dismiss()}
          hitSlop={12}
          accessibilityLabel="Скрыть подсказку"
        >
          <X size={18} color="#6B7080" />
        </Pressable>
      </View>

      {/* Прогресс-бар */}
      <View className="bg-primary-100 mt-3 h-1.5 w-full overflow-hidden rounded-full">
        <View className="bg-primary-500 h-full rounded-full" style={{ width: `${percent}%` }} />
      </View>

      {/* Шаги — компактная сетка */}
      <View className="mt-3 gap-2">
        {data.steps.map((step) => {
          const cfg = STEP_CONFIG[step.key];
          const Icon = cfg.icon;
          return (
            <Pressable
              key={step.key}
              onPress={() => router.push(cfg.route)}
              className={`flex-row items-center gap-3 rounded-md border p-2.5 ${
                step.done ? "border-success/30 bg-success-light/40" : "border-border bg-card"
              }`}
            >
              <View
                className={`h-7 w-7 items-center justify-center rounded-md ${
                  step.done ? "bg-success" : "bg-primary-100"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 size={14} color="#FFFFFF" />
                ) : (
                  <Icon size={14} color="#5B4FE2" />
                )}
              </View>
              <Text
                className={`flex-1 text-sm font-semibold ${
                  step.done ? "text-success line-through opacity-70" : "text-foreground"
                }`}
              >
                {cfg.title}
              </Text>
              {!step.done ? <Circle size={12} color="#9CA1A8" /> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
