import { SafeAreaView, View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function ProfileScreen() {
  function handleLogout() {
    // TODO Sprint 1: очистить SecureStore
    router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-12">
        <View className="mb-8 items-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-100">
            <Text className="text-3xl font-extrabold text-primary-700">АК</Text>
          </View>
          <Text className="mt-4 text-xl font-extrabold text-neutral-900">Анна Каримова</Text>
          <Text className="text-sm text-neutral-500">Менеджер · Маркетинг</Text>
        </View>

        <Pressable
          onPress={handleLogout}
          className="rounded-md border border-danger/40 py-4 active:bg-danger/10"
        >
          <Text className="text-center text-base font-semibold text-danger">Выйти</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
