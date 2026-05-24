import { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
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
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Me>("/auth/me")
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!me) return;
    setSaving(true);
    try {
      const updated = await api<Me>(`/employees/${me.id}`, {
        method: "PATCH",
        body: { firstName, lastName, phone },
      });
      setMe(updated);
      setEditing(false);
    } catch {
      Alert.alert("Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

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
        </View>

        {editing ? (
          <View className="space-y-3">
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Имя"
              className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Фамилия"
              className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+998 90 123 45 67"
              className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
            />
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="rounded-md bg-primary-500 py-4 active:bg-primary-600 disabled:opacity-60"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-bold text-white">Сохранить</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setEditing(false)} className="py-3">
              <Text className="text-center text-sm text-neutral-500">Отмена</Text>
            </Pressable>
          </View>
        ) : (
          <View className="space-y-3">
            <Pressable
              onPress={() => setEditing(true)}
              className="rounded-md border border-neutral-200 bg-white py-4 active:bg-neutral-50"
            >
              <Text className="text-center text-base font-semibold text-primary-500">
                Изменить профиль
              </Text>
            </Pressable>
            <Pressable
              onPress={handleLogout}
              className="rounded-md border border-danger/40 py-4 active:bg-danger/10"
            >
              <Text className="text-center text-base font-semibold text-danger">Выйти</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
