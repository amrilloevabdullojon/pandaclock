"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@pandaclock/ui";

/**
 * Demo-tenants для удобства локального запуска.
 * В production tenant определяется поддоменом; этот пикер появляется только
 * когда нет subdomain (т.е. host === localhost / IP).
 */
const DEMO_TENANTS = [
  { slug: "cloudit", label: "Cloud IT Studio · cloudit" },
  { slug: "plov-palace", label: "Plov Palace · plov-palace" },
  { slug: "uzbank", label: "Узбекистан Банк · uzbank" },
  { slug: "acmebank", label: "Acme Bank · acmebank" },
];

const DEMO_HINTS: Record<string, { email: string; password: string }> = {
  cloudit: { email: "maksim@cloudit.uz", password: "demo1234" },
  "plov-palace": { email: "rustam@plovpalace.uz", password: "demo1234" },
  uzbank: { email: "sherzod@uzbank.uz", password: "demo1234" },
  acmebank: { email: "anna@acmebank.uz", password: "password123" },
};

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  // detect: на localhost показываем пикер, на поддомене скрываем
  const showTenantPicker =
    typeof window !== "undefined" && !window.location.host.includes(".pandaclock.");

  const [tenant, setTenant] = useState(DEMO_TENANTS[0]?.slug ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useDemoCreds() {
    const hint = DEMO_HINTS[tenant];
    if (!hint) return;
    setEmail(hint.email);
    setPassword(hint.password);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenant: showTenantPicker ? tenant : undefined }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { code?: string };
        };
        setError(
          body.error?.code === "TENANT_NOT_FOUND"
            ? "Компания с таким адресом не найдена"
            : "Неверный email или пароль",
        );
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
            {showTenantPicker ? (
              <div className="bg-primary-50 space-y-2 rounded-md p-3">
                <label
                  htmlFor="tenant"
                  className="text-primary-700 text-xs font-semibold uppercase tracking-wider"
                >
                  Демо-компания (для локального запуска)
                </label>
                <select
                  id="tenant"
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value)}
                  className="border-primary-200 focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border bg-white px-3 text-sm"
                >
                  {DEMO_TENANTS.map((opt) => (
                    <option key={opt.slug} value={opt.slug}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={useDemoCreds}
                  className="text-primary-700 text-xs font-semibold underline-offset-2 hover:underline"
                >
                  Подставить демо-логин и пароль
                </button>
              </div>
            ) : null}

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
                <Link href="/forgot-password" className="text-primary-500 text-sm hover:underline">
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
                className="border-danger/40 bg-danger-light text-danger rounded-md border px-3 py-2 text-sm"
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
              <Link href="/register" className="text-primary-500 font-semibold hover:underline">
                {t("createAccount")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
