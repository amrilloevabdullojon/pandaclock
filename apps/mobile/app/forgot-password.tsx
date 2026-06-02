import * as React from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react-native";
import { publicApi, NetworkError } from "@/lib/api-client";
import { Button, Card, Input, Screen } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [networkError, setNetworkError] = React.useState<string | null>(null);

  async function handleSubmit() {
    setNetworkError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError("Похоже на не-email");
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.request("/auth/forgot-password", {
        method: "POST",
        body: { email: trimmed },
      });
      setSubmitted(true);
    } catch (error) {
      if (error instanceof NetworkError) {
        setNetworkError("Нет связи с сервером. Проверьте интернет.");
      } else {
        // По дизайну: API возвращает success даже если email не найден.
        // Любая другая ошибка — показываем общий fallback.
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen background="default" edges={["top", "bottom"]} scroll>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back button */}
      <View className="pb-2 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Назад ко входу"
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#5B4FE2" />
          <Text className="text-primary-500 text-sm font-semibold">Назад</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center pt-6"
      >
        <View className="mb-6 items-center">
          <Text className="text-4xl">📧</Text>
          <Text className="text-foreground mt-3 text-2xl font-extrabold">
            Восстановление пароля
          </Text>
          {!submitted ? (
            <Text className="text-muted-foreground mt-1 text-center text-sm">
              Введите email, на который зарегистрирован аккаунт
            </Text>
          ) : null}
        </View>

        {submitted ? (
          <Card padding="lg" className="items-center">
            <Text className="text-foreground text-base font-bold">Готово</Text>
            <Text className="text-muted-foreground mt-2 text-center text-sm">
              Если такой email зарегистрирован, мы отправили ссылку для восстановления. Срок
              действия — 1 час.
            </Text>
            <Text className="text-muted-foreground mt-2 text-center text-xs">
              Не пришло? Проверьте папку «Спам».
            </Text>
            <Button size="lg" fullWidth className="mt-5" onPress={() => router.replace("/login")}>
              Вернуться ко входу
            </Button>
          </Card>
        ) : (
          <Card padding="lg" className="gap-4">
            <Input
              label="Email"
              placeholder="you@company.uz"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={emailError ?? undefined}
              prefix={<Mail size={18} color="#6B7080" />}
              required
            />

            {networkError ? (
              <View
                accessibilityRole="alert"
                className="border-danger/40 bg-danger-light flex-row gap-2 rounded-md border px-3 py-2.5"
              >
                <AlertCircle size={18} color="#DC2626" className="mt-0.5" />
                <Text className="text-danger flex-1 text-sm leading-5">{networkError}</Text>
              </View>
            ) : null}

            <Button
              size="lg"
              fullWidth
              loading={submitting}
              loadingText="Отправляем…"
              onPress={handleSubmit}
              className="mt-2"
            >
              Отправить ссылку
            </Button>
          </Card>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
