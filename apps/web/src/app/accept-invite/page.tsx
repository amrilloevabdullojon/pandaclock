"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@pandaclock/ui";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const tenant = params.get("tenant") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/accept-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Slug": tenant,
        },
        body: JSON.stringify({ token, password, firstName, lastName }),
      });
      if (!response.ok) {
        setError("Приглашение недействительно или истекло");
        return;
      }
      router.push("/login?invite=accepted");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Добро пожаловать в команду 🐼</CardTitle>
        </CardHeader>
        <CardContent>
          {!token || !tenant ? (
            <p className="text-center text-sm text-danger">Ссылка повреждена.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-neutral-500">
                Вас пригласили в {tenant}.pandaclock.uz. Заполните профиль и придумайте пароль.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  required
                  placeholder="Имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  required
                  placeholder="Фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <Input
                type="password"
                required
                minLength={8}
                placeholder="Пароль (минимум 8 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? (
                <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
              ) : null}
              <Button type="submit" fullWidth size="lg" disabled={pending}>
                {pending ? "..." : "Войти в команду"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
