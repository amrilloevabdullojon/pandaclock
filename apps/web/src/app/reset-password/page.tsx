"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@pandaclock/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        setError("Ссылка недействительна или истекла");
        return;
      }
      router.push("/login?reset=success");
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
            <p className="text-center text-sm text-danger">Не указан токен из письма.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                required
                minLength={8}
                placeholder="Минимум 8 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? (
                <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
              ) : null}
              <Button type="submit" fullWidth size="lg" disabled={pending}>
                {pending ? "..." : "Сохранить пароль"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
