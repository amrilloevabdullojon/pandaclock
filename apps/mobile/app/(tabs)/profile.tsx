import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  Building2,
  Camera,
  ChevronRight,
  HelpCircle,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Pencil,
  Phone,
  Shield,
  Sun,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore, type ThemePreference } from "@/lib/theme-store";
import { pickAvatarFromGallery, uploadAvatar } from "@/lib/avatar-upload";
import { Avatar, Badge, Button, Card, Divider, Input, Screen, Skeleton } from "@/components/ui";

interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  phone?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Владелец",
  HR: "HR-менеджер",
  MANAGER: "Менеджер",
  EMPLOYEE: "Сотрудник",
};

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const tenantSlug = useAuthStore((state) => state.tenantSlug);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarTap() {
    if (uploadingAvatar) return;
    const picked = await pickAvatarFromGallery();
    if (!picked) return; // юзер отменил
    setUploadingAvatar(true);
    try {
      const { avatarUrl } = await uploadAvatar(picked);
      setMe((prev) => (prev ? { ...prev, avatarUrl } : prev));
    } catch (error) {
      Alert.alert(
        "Не удалось загрузить фото",
        error instanceof Error ? error.message : "Попробуйте ещё раз",
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

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
    Alert.alert("Выйти из аккаунта?", "Все локальные данные будут очищены.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <Screen background="default" edges={["top"]} scroll>
      {/* === Profile header === */}
      <View className="items-center pb-8 pt-6">
        {loading ? (
          <>
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="mt-4 h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-32" />
          </>
        ) : (
          <>
            <Pressable
              onPress={handleAvatarTap}
              disabled={uploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel="Сменить фото профиля"
              className="relative"
            >
              <Avatar
                size="2xl"
                gradient
                src={me?.avatarUrl ?? undefined}
                fallback={`${me?.firstName.charAt(0) ?? "?"}${me?.lastName.charAt(0) ?? ""}`}
              />
              <View className="bg-primary-500 border-background absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2">
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={14} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
            <Text className="text-foreground mt-4 text-xl font-extrabold">
              {me ? `${me.firstName} ${me.lastName}` : "—"}
            </Text>
            {me ? (
              <Badge variant="secondary" size="md" className="mt-2">
                {ROLE_LABEL[me.role] ?? me.role}
              </Badge>
            ) : null}
          </>
        )}
      </View>

      {editing ? (
        <Card padding="lg" className="gap-3">
          <Input label="Имя" value={firstName} onChangeText={setFirstName} placeholder="Имя" />
          <Input
            label="Фамилия"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Фамилия"
          />
          <Input
            label="Телефон"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+998 90 123 45 67"
            prefix={<Phone size={18} color="#6B7080" />}
          />
          <Button onPress={handleSave} loading={saving} loadingText="Сохраняем…" fullWidth>
            Сохранить
          </Button>
          <Button onPress={() => setEditing(false)} variant="ghost" fullWidth>
            Отмена
          </Button>
        </Card>
      ) : (
        <>
          {/* === Info card === */}
          <Card padding="none" className="overflow-hidden">
            <ProfileRow
              icon={<Mail size={18} color="#5B4FE2" />}
              label="Email"
              value={me?.email ?? ""}
              trailing={
                me?.emailVerified ? (
                  <Badge variant="success" size="sm" dot>
                    Подтверждён
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    Не подтверждён
                  </Badge>
                )
              }
            />
            <Divider />
            <ProfileRow
              icon={<Shield size={18} color="#5B4FE2" />}
              label="Компания"
              value={tenantSlug ? `${tenantSlug}.pandaclock.uz` : "—"}
            />
          </Card>

          <View className="mt-4 gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => setEditing(true)}
              leftIcon={<Pencil size={18} color="#5B4FE2" />}
              textClassName="text-primary-500"
            >
              Редактировать профиль
            </Button>
          </View>

          {/* === Theme === */}
          <View className="mt-6">
            <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
              Внешний вид
            </Text>
            <ThemePicker />
          </View>

          {/* === Admin === */}
          {me && ["OWNER", "ADMIN", "HR"].includes(me.role) ? (
            <View className="mt-6">
              <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
                Управление
              </Text>
              <Card padding="none" className="overflow-hidden">
                <MenuRow
                  icon={<Building2 size={18} color="#5B4FE2" />}
                  label="Отделы"
                  onPress={() => router.push("/departments")}
                />
              </Card>
            </View>
          ) : null}

          {/* === Menu === */}
          <View className="mt-6">
            <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
              Настройки
            </Text>
            <Card padding="none" className="overflow-hidden">
              <MenuRow
                icon={<Bell size={18} color="#5B4FE2" />}
                label="Уведомления"
                onPress={() => Alert.alert("Скоро", "Настройки уведомлений в разработке")}
              />
              <Divider />
              <MenuRow
                icon={<HelpCircle size={18} color="#5B4FE2" />}
                label="Помощь и поддержка"
                onPress={() => Alert.alert("Связь с нами", "support@pandaclock.uz")}
              />
            </Card>
          </View>

          {/* === Logout === */}
          <View className="mb-8 mt-6">
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={handleLogout}
              leftIcon={<LogOut size={18} color="#ED7280" />}
              textClassName="text-danger"
            >
              Выйти
            </Button>
            <Text className="text-muted-foreground mt-3 text-center text-xs">
              Pandaclock · v0.0.1
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 p-4">
      <View className="bg-primary-50 h-8 w-8 items-center justify-center rounded-md">{icon}</View>
      <View className="flex-1">
        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {label}
        </Text>
        <Text className="text-foreground mt-0.5 text-sm font-semibold" numberOfLines={1}>
          {value}
        </Text>
      </View>
      {trailing}
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 p-4 active:opacity-70"
    >
      <View className="bg-primary-50 h-8 w-8 items-center justify-center rounded-md">{icon}</View>
      <Text className="text-foreground flex-1 text-sm font-semibold">{label}</Text>
      <ChevronRight size={18} color="#9CA0B0" />
    </Pressable>
  );
}

function ThemePicker() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Светлая",
      icon: <Sun size={16} color={preference === "light" ? "#5B4FE2" : "#9CA0B0"} />,
    },
    {
      value: "dark",
      label: "Тёмная",
      icon: <Moon size={16} color={preference === "dark" ? "#5B4FE2" : "#9CA0B0"} />,
    },
    {
      value: "system",
      label: "Система",
      icon: <Monitor size={16} color={preference === "system" ? "#5B4FE2" : "#9CA0B0"} />,
    },
  ];

  return (
    <Card padding="sm" className="flex-row gap-1">
      {options.map((opt) => {
        const active = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => void setPreference(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-sm py-2.5 active:opacity-70 ${
              active ? "bg-primary-50 dark:bg-primary-900" : ""
            }`}
          >
            {opt.icon}
            <Text
              className={`text-xs font-bold ${
                active ? "text-primary-700 dark:text-primary-200" : "text-muted-foreground"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
