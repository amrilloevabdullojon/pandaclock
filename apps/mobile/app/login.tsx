import { useState } from "react";
import { router } from "expo-router";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useAuthStore } from "@/lib/auth-store";
import { publicApi, ApiError } from "@/lib/api-client";
import { Button, Card, Input, Screen } from "@/components/ui";

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const tenantSlug = useAuthStore((state) => state.tenantSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function handleLogin() {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Введите email";
    else if (!email.includes("@")) newErrors.email = "Похоже на не-email";
    if (!password) newErrors.password = "Введите пароль";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

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
      }>("/auth/login", { method: "POST", body: { email: email.trim(), password } });
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
      Alert.alert("Ошибка входа", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen background="default" edges={["top", "bottom"]} scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center pt-10"
      >
        {/* === Header === */}
        <View className="mb-8 items-center">
          <View className="relative mb-3 h-20 w-20 items-center justify-center">
            <View className="bg-primary-100 absolute h-24 w-24 rounded-full" />
            <Text className="text-5xl">🐼</Text>
          </View>
          <Text className="text-foreground text-2xl font-extrabold">Добро пожаловать</Text>
          <Text className="text-muted-foreground mt-1 text-sm">Войдите в свой аккаунт</Text>
          {tenantSlug ? (
            <View className="bg-primary-50 mt-3 rounded-full px-3 py-1">
              <Text className="text-primary-700 text-xs font-bold">{tenantSlug}.pandaclock.uz</Text>
            </View>
          ) : null}
        </View>

        {/* === Form === */}
        <Card padding="lg" className="gap-4">
          <Input
            label="Email"
            placeholder="you@company.uz"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((e) => ({ ...e, email: undefined }));
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
            prefix={<Mail size={18} color="#6B7080" />}
            required
          />

          <Input
            label="Пароль"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            error={errors.password}
            prefix={<Lock size={18} color="#6B7080" />}
            suffix={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? "Скрыть пароль" : "Показать пароль"}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#6B7080" />
                ) : (
                  <Eye size={18} color="#6B7080" />
                )}
              </Pressable>
            }
            required
          />

          <Button
            size="lg"
            fullWidth
            loading={isLoading}
            loadingText="Входим…"
            onPress={handleLogin}
            className="mt-2"
          >
            Войти
          </Button>
        </Card>

        {/* === Switch tenant === */}
        <View className="mt-6 items-center">
          <Pressable onPress={() => router.replace("/")} hitSlop={8} accessibilityRole="button">
            <Text className="text-muted-foreground text-sm font-semibold">Сменить компанию</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
