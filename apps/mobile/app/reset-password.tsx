import * as React from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react-native";
import { publicApi, ApiError, NetworkError } from "@/lib/api-client";
import { Button, Card, Input, Screen } from "@/components/ui";

function resetErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) return "Нет связи с сервером.";
  if (error instanceof ApiError) {
    switch (error.code) {
      case "RESET_TOKEN_INVALID":
        return "Ссылка недействительна или устарела. Запросите новую.";
      case "PASSWORD_TOO_SHORT":
        return "Пароль должен быть минимум 8 символов.";
      case "RATE_LIMITED":
        return "Слишком много попыток. Подождите и попробуйте снова.";
      default:
        return "Не удалось сменить пароль.";
    }
  }
  return "Что-то пошло не так.";
}

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [fieldError, setFieldError] = React.useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (!token) {
    return (
      <Screen background="default" edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-foreground text-lg font-bold">Не указан токен</Text>
          <Text className="text-muted-foreground mt-2 text-center text-sm">
            Откройте ссылку из письма для восстановления пароля
          </Text>
          <Button size="lg" className="mt-5" onPress={() => router.replace("/forgot-password")}>
            Запросить ссылку повторно
          </Button>
        </View>
      </Screen>
    );
  }

  function validate(): boolean {
    const next: typeof fieldError = {};
    if (password.length < 8) next.password = "Минимум 8 символов";
    if (password !== confirm) next.confirm = "Пароли не совпадают";
    setFieldError(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await publicApi.request("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
      router.replace("/login?reset=success");
    } catch (error) {
      setSubmitError(resetErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen background="default" edges={["top", "bottom"]} scroll>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="pb-2 pt-2">
        <Pressable
          onPress={() => router.replace("/login")}
          hitSlop={8}
          accessibilityLabel="Назад"
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#5B4FE2" />
          <Text className="text-primary-500 text-sm font-semibold">Вход</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center pt-6"
      >
        <View className="mb-6 items-center">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-foreground mt-3 text-2xl font-extrabold">Новый пароль</Text>
          <Text className="text-muted-foreground mt-1 text-center text-sm">
            Минимум 8 символов. После сохранения нужно будет залогиниться заново.
          </Text>
        </View>

        <Card padding="lg" className="gap-4">
          <Input
            label="Новый пароль"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (fieldError.password) setFieldError((f) => ({ ...f, password: undefined }));
            }}
            secureTextEntry
            autoComplete="new-password"
            error={fieldError.password}
            prefix={<Lock size={18} color="#6B7080" />}
            required
          />

          <Input
            label="Повторите пароль"
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              if (fieldError.confirm) setFieldError((f) => ({ ...f, confirm: undefined }));
            }}
            secureTextEntry
            autoComplete="new-password"
            error={fieldError.confirm}
            prefix={<Lock size={18} color="#6B7080" />}
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
            loading={submitting}
            loadingText="Сохраняем…"
            onPress={handleSubmit}
            className="mt-2"
          >
            Сохранить пароль
          </Button>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
