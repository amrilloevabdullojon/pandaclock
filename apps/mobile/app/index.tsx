import { useState } from "react";
import { Redirect, router } from "expo-router";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { useAuthStore } from "@/lib/auth-store";
import { Button, Input, Screen } from "@/components/ui";

export default function WelcomeScreen() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const tenantSlug = useAuthStore((state) => state.tenantSlug);
  const setTenantSlug = useAuthStore((state) => state.setTenantSlug);
  const [slug, setSlug] = useState(tenantSlug ?? "");
  const [error, setError] = useState<string | null>(null);

  if (accessToken) {
    return <Redirect href="/(tabs)/home" />;
  }

  function handleContinue() {
    const cleaned = slug.trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]{2,30}$/.test(cleaned)) {
      setError("Только латиница, цифры и дефис. Минимум 3 символа.");
      return;
    }
    setError(null);
    setTenantSlug(cleaned);
    router.push("/login");
  }

  return (
    <Screen background="default" edges={["top", "bottom"]} className="justify-center">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center"
      >
        {/* === Hero === */}
        <View className="mb-12 items-center">
          <View className="relative mb-4 h-24 w-24 items-center justify-center">
            <View className="bg-primary-500 absolute h-32 w-32 rounded-full opacity-10" />
            <View className="bg-primary-100 absolute h-24 w-24 rounded-full" />
            <Text className="text-6xl">🐼</Text>
          </View>
          <Text className="text-foreground text-3xl font-extrabold">Pandaclock</Text>
          <Text className="text-muted-foreground mt-2 text-center text-base">
            HR-система, которая работает за вас
          </Text>
        </View>

        {/* === Form === */}
        <View className="gap-4">
          <Input
            label="Адрес вашей компании"
            placeholder="acmebank"
            value={slug}
            onChangeText={(value) => {
              setSlug(value.toLowerCase());
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            error={error ?? undefined}
            hint={!error ? "Получили при регистрации компании" : undefined}
            suffix={<Text className="text-muted-foreground text-sm">.pandaclock.uz</Text>}
            required
          />

          <Button size="lg" fullWidth onPress={handleContinue} disabled={slug.trim().length < 3}>
            Продолжить →
          </Button>
        </View>

        {/* === Footer === */}
        <View className="mt-8 items-center">
          <Text className="text-muted-foreground text-xs">
            Ещё нет аккаунта? Откройте сайт{" "}
            <Text className="text-primary-500 font-bold">pandaclock.uz</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
