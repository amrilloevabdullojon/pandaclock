"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@pandaclock/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function resetErrorMessage(code: string | undefined): string {
  switch (code) {
    case "RESET_TOKEN_INVALID":
      return "Ссылка недействительна или устарела. Запросите новую.";
    case "PASSWORD_TOO_SHORT":
      return "Пароль должен быть минимум 8 символов.";
    case "RATE_LIMITED":
      return "Слишком много попыток. Подождите и попробуйте снова.";
    default:
      return "Не удалось сменить пароль. Попробуйте ещё раз.";
  }
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validateLocal(): boolean {
    const next: typeof fieldError = {};
    if (password.length < 8) next.password = "Минимум 8 символов";
    if (password !== confirmPassword) next.confirm = "Пароли не совпадают";
    setFieldError(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateLocal()) return;
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        setError(resetErrorMessage(body.code));
        return;
      }
      router.push("/login?reset=success");
    } catch {
      setError("Нет связи с сервером. Проверьте интернет.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Новый пароль</CardTitle>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-3 text-center">
              <p className="text-danger text-sm font-semibold">Не указан токен из письма.</p>
              <Link
                href="/forgot-password"
                className="text-primary-500 inline-block text-sm font-semibold hover:underline"
              >
                Запросить ссылку повторно
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-neutral-500">
                Придумайте пароль не короче 8 символов. После сохранения нужно будет залогиниться
                заново.
              </p>
              <div className="space-y-1">
                <label htmlFor="new-pwd" className="text-sm font-semibold text-neutral-700">
                  Новый пароль
                </label>
                <Input
                  id="new-pwd"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldError.password) {
                      setFieldError((f) => ({ ...f, password: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldError.password}
                  autoComplete="new-password"
                />
                {fieldError.password ? (
                  <p className="text-danger text-xs font-semibold">{fieldError.password}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="confirm-pwd" className="text-sm font-semibold text-neutral-700">
                  Повторите пароль
                </label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldError.confirm) {
                      setFieldError((f) => ({ ...f, confirm: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldError.confirm}
                  autoComplete="new-password"
                />
                {fieldError.confirm ? (
                  <p className="text-danger text-xs font-semibold">{fieldError.confirm}</p>
                ) : null}
              </div>
              {error ? (
                <p
                  role="alert"
                  className="border-danger/40 bg-danger-light text-danger rounded-md border px-3 py-2 text-sm"
                >
                  {error}
                </p>
              ) : null}
              <Button type="submit" fullWidth size="lg" loading={pending} loadingText="Сохраняем…">
                Сохранить пароль
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
