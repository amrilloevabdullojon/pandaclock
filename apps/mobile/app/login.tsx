import { useState } from "react";
import { router } from "expo-router";
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Заполните все поля");
      return;
    }
    setIsLoading(true);
    try {
      // TODO Sprint 1: реальный вызов API, сохранение токена в SecureStore
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("Неверный email или пароль");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-neutral-50 px-6 pt-20">
      <Text className="mb-2 text-center text-5xl">🐼</Text>
      <Text className="mb-1 text-center text-2xl font-extrabold text-neutral-900">
        Добро пожаловать
      </Text>
      <Text className="mb-8 text-center text-sm text-neutral-500">Войдите в свой аккаунт</Text>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-semibold text-neutral-700">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@company.uz"
          className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
        />
      </View>

      <View className="mb-6">
        <Text className="mb-2 text-sm font-semibold text-neutral-700">Пароль</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
        />
      </View>

      <Pressable
        onPress={handleLogin}
        disabled={isLoading}
        className="rounded-md bg-primary-500 py-4 shadow-primary active:bg-primary-600 disabled:opacity-60"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-base font-bold text-white">Войти</Text>
        )}
      </Pressable>
    </View>
  );
}
