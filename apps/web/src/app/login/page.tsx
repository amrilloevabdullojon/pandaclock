"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@pandaclock/ui";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError("Неверный email или пароль");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 text-center text-4xl">🐼</div>
          <CardTitle className="text-center text-2xl">{t("title")}</CardTitle>
          <p className="text-center text-sm text-neutral-500">{t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-neutral-700">
                {t("emailLabel")}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.uz"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-neutral-700">
                  {t("passwordLabel")}
                </label>
                <Link href="/forgot-password" className="text-sm text-primary-500 hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <p
                className="rounded-md border border-danger/40 bg-danger-light px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" fullWidth size="lg" disabled={isLoading}>
              {isLoading ? "..." : t("submit")}
            </Button>

            <p className="text-center text-sm text-neutral-500">
              {t("noAccount")}{" "}
              <Link href="/register" className="font-semibold text-primary-500 hover:underline">
                {t("createAccount")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
