import { SafeAreaView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { Play, Pause, Coffee } from "lucide-react-native";
import { useTimeTracking, type SessionStatus, type TodaySession } from "@/lib/use-time-tracking";

export default function HomeScreen() {
  const tracking = useTimeTracking();

  if (tracking.loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator color="#5B4FE2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-2xl font-extrabold text-neutral-900">Доброе утро, Анна 👋</Text>
        <Text className="mb-10 text-sm text-neutral-500">{formattedToday()}</Text>

        <StateView status={tracking.session.status} session={tracking.session} actions={tracking} />
      </View>
    </SafeAreaView>
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
      <View className="flex-1 items-center justify-center">
        <CircleButton
          onPress={actions.startDay}
          color="success"
          icon={<Play color="#fff" size={64} fill="#fff" />}
          label={"Начать\nдень"}
        />
        <Text className="mt-8 text-sm text-neutral-500">
          {geofenceLabel(session.geofenceStatus)}
        </Text>
      </View>
    );
  }

  if (status === "WORKING" && session.startedAt) {
    return (
      <View className="flex-1 items-center">
        <Text className="text-base text-neutral-500">Вы работаете</Text>
        <Text className="my-3 text-7xl font-extrabold text-primary-500">
          {formatDuration(session.startedAt)}
        </Text>
        <Text className="mb-12 text-sm text-neutral-500">
          Начали в {formatTime(session.startedAt)} {session.isLate ? "· опоздание" : ""}
        </Text>

        <CircleButton
          onPress={actions.finishDay}
          color="danger"
          icon={<Pause color="#fff" size={56} />}
          label={"Завершить\nдень"}
        />

        <Pressable
          onPress={actions.startBreak}
          className="mt-8 w-full flex-row items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white py-4 active:bg-neutral-50"
        >
          <Coffee color="#5B4FE2" size={20} />
          <Text className="text-base font-semibold text-neutral-700">Сделать перерыв</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "ON_BREAK" && session.currentBreak) {
    return (
      <View className="flex-1 items-center">
        <Text className="text-base text-neutral-500">Перерыв</Text>
        <Text className="my-3 text-7xl font-extrabold text-warning">
          {formatDuration(session.currentBreak.startedAt)}
        </Text>
        <Text className="mb-12 text-sm text-neutral-500">
          Начали в {formatTime(session.currentBreak.startedAt)}
        </Text>

        <CircleButton
          onPress={actions.finishBreak}
          color="primary"
          icon={<Play color="#fff" size={56} fill="#fff" />}
          label={"Вернуться\nк работе"}
        />
      </View>
    );
  }

  if (status === "FINISHED") {
    const hours = session.totalMinutes ? Math.floor(session.totalMinutes / 60) : 0;
    const minutes = session.totalMinutes ? session.totalMinutes % 60 : 0;
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-7xl">🎉</Text>
        <Text className="mt-4 text-2xl font-extrabold text-neutral-900">Отличный день!</Text>
        <Text className="my-3 text-6xl font-extrabold text-success">
          {hours}ч {minutes}м
        </Text>
        <Text className="text-sm text-neutral-500">Отработано сегодня</Text>
        <Text className="mt-12 text-base text-neutral-500">Увидимся завтра 👋</Text>
      </View>
    );
  }

  return null;
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
    success: "bg-success active:bg-success/80",
    danger: "bg-danger active:bg-danger/80",
    primary: "bg-primary-500 active:bg-primary-600",
  };
  return (
    <Pressable
      onPress={onPress}
      className={`h-60 w-60 items-center justify-center rounded-full shadow-primary ${colorMap[color]}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text className="mt-3 text-center text-xl font-extrabold uppercase tracking-wide text-white">
        {label}
      </Text>
    </Pressable>
  );
}

function geofenceLabel(status: TodaySession["geofenceStatus"]): string {
  switch (status) {
    case "inside":
      return "📍 Местоположение: офис ✓";
    case "outside":
      return "📍 Вы вне зоны офиса";
    case "no_coords":
      return "📍 Геолокация не предоставлена";
    default:
      return "Готовы начать день?";
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  return `${Math.floor(minutes / 60)}ч ${minutes % 60}м`;
}

function formattedToday(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
