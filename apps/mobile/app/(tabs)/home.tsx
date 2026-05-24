import { useState } from "react";
import { View, Text, Pressable, SafeAreaView } from "react-native";
import { Play, Pause, Coffee } from "lucide-react-native";

type Status = "NOT_STARTED" | "WORKING" | "BREAK" | "FINISHED";

export default function HomeScreen() {
  const [status, setStatus] = useState<Status>("NOT_STARTED");

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-2xl font-extrabold text-neutral-900">Доброе утро, Анна! 👋</Text>
        <Text className="mb-12 text-sm text-neutral-500">Понедельник, 24 мая</Text>

        {status === "NOT_STARTED" ? <NotStarted onStart={() => setStatus("WORKING")} /> : null}
        {status === "WORKING" ? (
          <Working onBreak={() => setStatus("BREAK")} onFinish={() => setStatus("FINISHED")} />
        ) : null}
        {status === "BREAK" ? <OnBreak onResume={() => setStatus("WORKING")} /> : null}
        {status === "FINISHED" ? <Finished /> : null}
      </View>
    </SafeAreaView>
  );
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

function NotStarted({ onStart }: { onStart: () => void }) {
  return (
    <View className="flex-1 items-center justify-center">
      <CircleButton
        onPress={onStart}
        color="success"
        icon={<Play color="#fff" size={64} fill="#fff" />}
        label={"Начать\nдень"}
      />
      <Text className="mt-8 text-sm text-neutral-500">📍 Местоположение: Офис ✓</Text>
    </View>
  );
}

function Working({ onBreak, onFinish }: { onBreak: () => void; onFinish: () => void }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-base text-neutral-500">Вы работаете</Text>
      <Text className="my-3 text-7xl font-extrabold text-primary-500">4ч 23м</Text>
      <Text className="mb-12 text-sm text-neutral-500">Начали в 9:02</Text>

      <CircleButton
        onPress={onFinish}
        color="danger"
        icon={<Pause color="#fff" size={56} />}
        label={"Завершить\nдень"}
      />

      <Pressable
        onPress={onBreak}
        className="mt-8 w-full flex-row items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white py-4 active:bg-neutral-50"
      >
        <Coffee color="#5B4FE2" size={20} />
        <Text className="text-base font-semibold text-neutral-700">Сделать перерыв</Text>
      </Pressable>
    </View>
  );
}

function OnBreak({ onResume }: { onResume: () => void }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-base text-neutral-500">Перерыв</Text>
      <Text className="my-3 text-7xl font-extrabold text-warning">15м 32с</Text>
      <Text className="mb-12 text-sm text-neutral-500">Начали в 13:00</Text>

      <CircleButton
        onPress={onResume}
        color="primary"
        icon={<Play color="#fff" size={56} fill="#fff" />}
        label={"Вернуться\nк работе"}
      />
    </View>
  );
}

function Finished() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-7xl">🎉</Text>
      <Text className="mt-4 text-2xl font-extrabold text-neutral-900">Отличный день!</Text>
      <Text className="my-3 text-6xl font-extrabold text-success">8ч 15м</Text>
      <Text className="text-sm text-neutral-500">Отработано сегодня</Text>
      <Text className="mt-12 text-base text-neutral-500">Увидимся завтра 👋</Text>
    </View>
  );
}
