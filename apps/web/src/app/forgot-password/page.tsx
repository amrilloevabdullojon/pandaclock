"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@pandaclock/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNetworkError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError("Похоже на не-email");
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      // По дизайну: всегда показываем "если есть, отправили" — анти-enumeration.
      setSubmitted(true);
    } catch {
      setNetworkError("Нет связи с сервером. Проверьте интернет.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Восстановление пароля</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <p className="text-4xl">📧</p>
              <p className="text-sm text-neutral-600">
                Если такой email зарегистрирован, мы отправили ссылку для восстановления. Срок
                действия — 1 час.
              </p>
              <p className="text-xs text-neutral-400">Не пришло? Проверьте папку «Спам».</p>
              <Link
                href="/login"
                className="text-primary-500 inline-block text-sm font-semibold hover:underline"
              >
                ← Вернуться ко входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-neutral-500">
                Введите email, на который зарегистрирован ваш аккаунт.
              </p>
              <div className="space-y-1">
                <Input
                  type="email"
                  required
                  placeholder="you@company.uz"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  aria-invalid={!!emailError}
                />
                {emailError ? (
                  <p className="text-danger text-xs font-semibold">{emailError}</p>
                ) : null}
              </div>
              {networkError ? (
                <p
                  role="alert"
                  className="border-danger/40 bg-danger-light text-danger rounded-md border px-3 py-2 text-sm"
                >
                  {networkError}
                </p>
              ) : null}
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={submitting}
                loadingText="Отправляем…"
              >
                Отправить ссылку
              </Button>
              <p className="text-center text-sm text-neutral-500">
                <Link href="/login" className="text-primary-500 hover:underline">
                  ← Назад ко входу
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
