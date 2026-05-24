import { useState } from "react";
import { Link, Redirect } from "expo-router";
import { View, Text, Pressable, TextInput } from "react-native";
import { useAuthStore } from "@/lib/auth-store";

export default function WelcomeScreen() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const tenantSlug = useAuthStore((state) => state.tenantSlug);
  const setTenantSlug = useAuthStore((state) => state.setTenantSlug);
  const [slug, setSlug] = useState(tenantSlug ?? "");

  if (accessToken) {
    return <Redirect href="/(tabs)/home" />;
  }

  function handleContinue() {
    const cleaned = slug.trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]{2,30}$/.test(cleaned)) return;
    setTenantSlug(cleaned);
  }

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-6">
      <Text className="mb-2 text-6xl">🐼</Text>
      <Text className="mb-2 text-3xl font-extrabold text-neutral-900">Pandaclock</Text>
      <Text className="mb-10 text-center text-base text-neutral-500">
        HR-система, которая работает за вас
      </Text>

      <View className="mb-3 w-full">
        <Text className="mb-2 text-sm font-semibold text-neutral-700">Адрес вашей компании</Text>
        <View className="flex-row items-center rounded-md border border-neutral-200 bg-white px-4">
          <TextInput
            value={slug}
            onChangeText={(value) => setSlug(value.toLowerCase())}
            placeholder="acmebank"
            autoCapitalize="none"
            className="flex-1 py-3 text-base text-neutral-900"
          />
          <Text className="text-sm text-neutral-400">.pandaclock.uz</Text>
        </View>
      </View>

      <Link href="/login" asChild>
        <Pressable
          onPress={handleContinue}
          className="w-full rounded-md bg-primary-500 px-6 py-4 shadow-primary active:bg-primary-600"
          accessibilityRole="button"
          accessibilityLabel="Продолжить"
        >
          <Text className="text-center text-base font-bold text-white">Продолжить →</Text>
        </Pressable>
      </Link>
    </View>
  );
}
