import { SafeAreaView, View, Text } from "react-native";

export default function TasksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-6xl">✅</Text>
        <Text className="mt-4 text-xl font-bold text-neutral-700">Задачи</Text>
        <Text className="mt-2 text-center text-sm text-neutral-500">
          Будет реализовано в Sprint 4
        </Text>
      </View>
    </SafeAreaView>
  );
}
