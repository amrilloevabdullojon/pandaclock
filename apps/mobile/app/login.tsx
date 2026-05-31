import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useAuthStore } from "@/lib/auth-store";
import { publicApi, ApiError, NetworkError } from "@/lib/api-client";
import { Button, Card, Input, Screen } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Маппинг API error code → понятное сообщение для пользователя.
 *
 * INVALID_CREDENTIALS специально единый (не различаем «пользователь не найден»
 * vs «пароль неверный») — это даёт enumeration attack vector.
 */
function messageForLoginError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.";
  }
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "Неверный email или пароль.";
      case "TENANT_NOT_FOUND":
        return "Компания с таким адресом не найдена. Проверьте slug.";
      case "USER_INACTIVE":
        return "Аккаунт деактивирован. Обратитесь к администратору компании.";
      case "RATE_LIMITED":
      case "ThrottlerException: Too Many Requests":
        return "Слишком много попыток. Подождите 5 минут и попробуйте снова.";
      default:
        if (error.status >= 500) return "Сервер недоступен. Попробуйте через минуту.";
        return "Не удалось войти. Попробуйте ещё раз.";
    }
  }
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const tenantSlug = useAuthStore((state) => state.tenantSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  /** Общая ошибка от сервера (показывается под формой). */
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validateLocal(): boolean {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Введите email";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Похоже на не-email";
    if (!password) next.password = "Введите пароль";
    else if (password.length < 8) next.password = "Минимум 8 символов";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleLogin() {
    setSubmitError(null);
    if (!validateLocal()) return;

    if (!tenantSlug) {
      // Без тенанта запрос не имеет смысла — отправляем на главный экран.
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
      setSubmitError(messageForLoginError(error));
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

          {submitError ? (
            <View
              accessibilityRole="alert"
              className="border-danger/40 bg-danger-light flex-row gap-2 rounded-md border px-3 py-2.5"
            >
              <AlertCircle size={18} color="#DC2626" className="mt-0.5" />
              <Text className="text-danger flex-1 text-sm leading-5">{submitError}</Text>
            </View>
          ) : null}

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
