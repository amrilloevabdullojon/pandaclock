import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, Coffee, MapPin, Pause, Play } from "lucide-react-native";
import { useTimeTracking, type SessionStatus, type TodaySession } from "@/lib/use-time-tracking";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, Screen, Skeleton } from "@/components/ui";
import { OnboardingCard } from "@/components/onboarding-card";

interface MeResponse {
  firstName: string;
  lastName: string;
}

export default function HomeScreen() {
  const tracking = useTimeTracking();
  const [firstName, setFirstName] = React.useState<string>("Коллега");

  React.useEffect(() => {
    let cancelled = false;
    api<MeResponse>("/auth/me")
      .then((me) => {
        if (!cancelled) setFirstName(me.firstName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await api<{ count: number }>("/notifications/unread-count");
        if (!cancelled) setUnreadCount(res.count);
      } catch {
        // silent — bell просто без числа
      }
    }
    void tick();
    // Polling каждые 30 сек когда экран активен
    const timer = setInterval(() => void tick(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const greeting = getGreeting();

  if (tracking.loading) {
    return (
      <Screen background="default" edges={["top"]}>
        <View className="pt-4">
          <Skeleton className="mb-2 h-7 w-48" />
          <Skeleton className="mb-8 h-4 w-32" />
          <Skeleton className="h-60 w-60 self-center rounded-full" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background="default" edges={["top"]} scroll>
      {/* === Header === */}
      <View className="flex-row items-start justify-between pb-6 pt-4">
        <View className="flex-1">
          <Text className="text-foreground text-2xl font-extrabold">
            {greeting}, {firstName} 👋
          </Text>
          <Text className="text-muted-foreground mt-1 text-sm">{formattedToday()}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/notifications")}
          hitSlop={12}
          accessibilityLabel={`Уведомления${unreadCount > 0 ? `, ${unreadCount} непрочитанных` : ""}`}
          className="relative h-10 w-10 items-center justify-center rounded-full"
        >
          <Bell size={22} color="#1F2233" />
          {unreadCount > 0 ? (
            <View className="bg-danger absolute right-1.5 top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full px-1">
              <Text className="text-xs font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <OnboardingCard />

      <StateView status={tracking.session.status} session={tracking.session} actions={tracking} />
    </Screen>
  );
}

interface ActionHandlers {
  startDay: () => Promise<void>;
  finishDay: () => Promise<void>;
  startBreak: () => Promise<void>;
  finishBreak: () => Promise<void>;
}

function StateView({
  status,
  session,
  actions,
}: {
  status: SessionStatus;
  session: TodaySession;
  actions: ActionHandlers;
}) {
  if (status === "NOT_STARTED") {
    return (
      <View className="items-center pb-12">
        <CircleButton
          onPress={actions.startDay}
          color="success"
          icon={<Play color="#fff" size={56} fill="#fff" />}
          label={"Начать\nдень"}
        />
        <GeofencePill status={session.geofenceStatus} className="mt-8" />
      </View>
    );
  }

  if (status === "WORKING" && session.startedAt) {
    return (
      <View className="items-center pb-12">
        <View className="mb-8 items-center">
          <Badge variant="success" dot size="lg">
            Вы работаете
          </Badge>
          <LiveDuration
            startIso={session.startedAt}
            className="text-primary-500 my-3 text-7xl font-extrabold"
          />
          <Text className="text-muted-foreground text-sm">
            Начали в {formatTime(session.startedAt)}
            {session.isLate ? " · опоздание" : ""}
          </Text>
        </View>

        <CircleButton
          onPress={actions.finishDay}
          color="danger"
          icon={<Pause color="#fff" size={48} />}
          label={"Завершить\nдень"}
        />

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onPress={actions.startBreak}
          leftIcon={<Coffee color="#5B4FE2" size={20} />}
          className="mt-6"
          textClassName="text-primary-500"
        >
          Сделать перерыв
        </Button>
      </View>
    );
  }

  if (status === "ON_BREAK" && session.currentBreak) {
    return (
      <View className="items-center pb-12">
        <View className="mb-8 items-center">
          <Badge variant="warning" dot size="lg">
            На перерыве
          </Badge>
          <LiveDuration
            startIso={session.currentBreak.startedAt}
            className="text-warning my-3 text-7xl font-extrabold"
          />
          <Text className="text-muted-foreground text-sm">
            Начали в {formatTime(session.currentBreak.startedAt)}
          </Text>
        </View>

        <CircleButton
          onPress={actions.finishBreak}
          color="primary"
          icon={<Play color="#fff" size={48} fill="#fff" />}
          label={"Вернуться\nк работе"}
        />
      </View>
    );
  }

  if (status === "FINISHED") {
    const hours = session.totalMinutes ? Math.floor(session.totalMinutes / 60) : 0;
    const minutes = session.totalMinutes ? session.totalMinutes % 60 : 0;
    return (
      <Card padding="xl" className="items-center">
        <Text className="text-6xl">🎉</Text>
        <Text className="text-foreground mt-3 text-2xl font-extrabold">Отличный день!</Text>
        <Text className="text-success my-4 text-6xl font-extrabold">
          {hours}ч {minutes}м
        </Text>
        <Text className="text-muted-foreground text-sm">Отработано сегодня</Text>
        <Text className="text-muted-foreground mt-10 text-base">Увидимся завтра 👋</Text>
      </Card>
    );
  }

  return (
    <EmptyState
      emoji="🐼"
      title="Что-то пошло не так"
      description="Не получили данные о текущей сессии. Потяните вниз для обновления."
    />
  );
}

function LiveDuration({ startIso, className }: { startIso: string; className?: string }) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);
  return <Text className={className}>{formatDuration(startIso)}</Text>;
}

function CircleButton({
  onPress,
  color,
  icon,
  label,
}: {
  onPress: () => void;
  color: "success" | "danger" | "primary";
  icon: React.ReactNode;
  label: string;
}) {
  const colorMap = {
    success: "bg-success",
    danger: "bg-danger",
    primary: "bg-primary-500",
  } as const;
  return (
    <Pressable
      onPress={onPress}
      className={`shadow-primary h-56 w-56 items-center justify-center rounded-full active:opacity-80 ${colorMap[color]}`}
      accessibilityRole="button"
      accessibilityLabel={label.replace("\n", " ")}
    >
      {icon}
      <Text className="mt-3 text-center text-lg font-extrabold uppercase tracking-wide text-white">
        {label}
      </Text>
    </Pressable>
  );
}

function GeofencePill({
  status,
  className,
}: {
  status: TodaySession["geofenceStatus"];
  className?: string;
}) {
  const map: Record<
    TodaySession["geofenceStatus"],
    { label: string; variant: "success" | "warning" | "secondary" | "danger" }
  > = {
    inside: { label: "Местоположение: офис", variant: "success" },
    outside: { label: "Вы вне зоны офиса", variant: "warning" },
    no_coords: { label: "Геолокация не предоставлена", variant: "secondary" },
    no_geofence: { label: "Готовы начать день?", variant: "secondary" },
  };
  const { label, variant } = map[status];
  return (
    <View className={className}>
      <Badge variant={variant}>
        <MapPin size={10} color={variant === "warning" ? "#C7762A" : "#6B7080"} />
        {`  ${label}`}
      </Badge>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  if (h < 23) return "Добрый вечер";
  return "Доброй ночи";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  return `${Math.floor(minutes / 60)}ч ${String(minutes % 60).padStart(2, "0")}м`;
}

function formattedToday(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
