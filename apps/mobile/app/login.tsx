import { useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuthStore } from "@/lib/auth-store";
import { publicApi, ApiError } from "@/lib/api-client";

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const tenantSlug = useAuthStore((state) => state.tenantSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Заполните все поля");
      return;
    }
    if (!tenantSlug) {
      Alert.alert("Сначала введите адрес компании");
      router.replace("/");
      return;
    }
    setIsLoading(true);
    try {
      const tokens = await publicApi.request<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/login", { method: "POST", body: { email, password } });
      await setSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      router.replace("/(tabs)/home");
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === "INVALID_CREDENTIALS"
          ? "Неверный email или пароль"
          : "Не удалось войти. Попробуйте позже.";
      Alert.alert(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-neutral-50"
    >
      <View className="flex-1 px-6 pt-20">
        <Text className="mb-2 text-center text-5xl">🐼</Text>
        <Text className="mb-1 text-center text-2xl font-extrabold text-neutral-900">
          Добро пожаловать
        </Text>
        <Text className="mb-2 text-center text-sm text-neutral-500">Войдите в свой аккаунт</Text>
        {tenantSlug ? (
          <Text className="mb-8 text-center text-xs text-primary-500">
            {tenantSlug}.pandaclock.uz
          </Text>
        ) : null}

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
    </KeyboardAvoidingView>
  );
}
