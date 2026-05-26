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
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/lib/auth-store";
import { usePushRegistration } from "@/lib/use-push-notifications";
import { useDailyReminder } from "@/lib/use-daily-reminder";
import { useNetworkStatus } from "@/lib/use-network-status";
import { Text } from "react-native";

export default function RootLayout() {
  usePushRegistration();
  useDailyReminder();
  const online = useNetworkStatus();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator size="large" color="#5B4FE2" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
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
      </Stack>
    </>
  );
}
