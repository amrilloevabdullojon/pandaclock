"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent } from "@pandaclock/ui";

type Status = "PENDING" | "SUCCESS" | "ERROR";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("PENDING");

  useEffect(() => {
    if (!token) {
      setStatus("ERROR");
      return;
    }
    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((response) => {
      setStatus(response.ok ? "SUCCESS" : "ERROR");
    });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          {status === "PENDING" ? (
            <>
              <p className="text-4xl">⏳</p>
              <p className="text-sm text-neutral-500">Проверяем токен...</p>
            </>
          ) : null}
          {status === "SUCCESS" ? (
            <>
              <p className="text-5xl">✅</p>
              <h1 className="text-2xl font-extrabold text-neutral-900">Email подтверждён</h1>
              <p className="text-sm text-neutral-500">Теперь вы можете войти в Pandaclock.</p>
              <Button asChild size="lg">
                <Link href="/login">Войти</Link>
              </Button>
            </>
          ) : null}
          {status === "ERROR" ? (
            <>
              <p className="text-5xl">❌</p>
              <h1 className="text-2xl font-extrabold text-neutral-900">Ссылка недействительна</h1>
              <p className="text-sm text-neutral-500">
                Возможно, она истекла или уже была использована.
              </p>
              <Button asChild variant="secondary">
                <Link href="/login">Вернуться ко входу</Link>
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
