import { useEffect, useState } from "react";
import { SafeAreaView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
}

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<Me>("/auth/me")
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator color="#5B4FE2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 pt-12">
        <View className="mb-8 items-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-100">
            <Text className="text-3xl font-extrabold text-primary-700">
              {me?.firstName.charAt(0) ?? "?"}
              {me?.lastName.charAt(0) ?? ""}
            </Text>
          </View>
          <Text className="mt-4 text-xl font-extrabold text-neutral-900">
            {me ? `${me.firstName} ${me.lastName}` : "Pandaclock"}
          </Text>
          <Text className="text-sm text-neutral-500">{me?.email ?? ""}</Text>
          {me ? (
            <Text className="mt-1 text-xs text-neutral-400">{me.role}</Text>
          ) : null}
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
