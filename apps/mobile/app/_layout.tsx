import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore, useThemeSystemSync } from "@/lib/theme-store";
import { usePushRegistration } from "@/lib/use-push-notifications";
import { useDailyReminder } from "@/lib/use-daily-reminder";
import { useNetworkStatus } from "@/lib/use-network-status";

export default function RootLayout() {
  usePushRegistration();
  useDailyReminder();
  useThemeSystemSync();
  const online = useNetworkStatus();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  const themeHydrated = useThemeStore((state) => state.hydrated);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const resolvedTheme = useThemeStore((state) => state.resolved);

  useEffect(() => {
    void hydrate();
    void hydrateTheme();
  }, [hydrate, hydrateTheme]);

  if (!fontsLoaded || !hydrated || !themeHydrated) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#5B4FE2" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      {!online ? (
        <View className="bg-warning px-4 py-1">
          <Text className="text-center text-xs font-semibold text-white">
            📴 Офлайн-режим — отметки сохраняются и отправятся при появлении сети
          </Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="team" />
        <Stack.Screen name="shifts" />
        <Stack.Screen name="notifications" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}
