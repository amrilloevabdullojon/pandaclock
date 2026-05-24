import { Link, Redirect } from "expo-router";
import { View, Text, Pressable } from "react-native";

const IS_LOGGED_IN = false; // TODO Sprint 1: реальная проверка токена через SecureStore

export default function WelcomeScreen() {
  if (IS_LOGGED_IN) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-6">
      <Text className="mb-2 text-6xl">🐼</Text>
      <Text className="mb-2 text-3xl font-extrabold text-neutral-900">Pandaclock</Text>
      <Text className="mb-10 text-center text-base text-neutral-500">
        HR-система, которая работает за вас
      </Text>

      <Link href="/login" asChild>
        <Pressable
          className="w-full rounded-md bg-primary-500 px-6 py-4 shadow-primary active:bg-primary-600"
          accessibilityRole="button"
          accessibilityLabel="Войти"
        >
          <Text className="text-center text-base font-bold text-white">Войти</Text>
        </Pressable>
      </Link>
    </View>
  );
}
