"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@pandaclock/ui";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Глобальный fallback на ошибки вне /dashboard (логин, лендинг и т.д.)
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error("[root] route error:", error);
  }, [error]);

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-destructive/10 text-destructive flex h-20 w-20 items-center justify-center rounded-full">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-foreground text-2xl font-bold">Что-то пошло не так</h1>
        <p className="text-muted-foreground text-sm">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться позже.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} leftIcon={<RotateCcw className="h-4 w-4" />}>
          Попробовать снова
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <Alert variant="danger" className="max-w-2xl text-left">
          <AlertTitle>Detail (dev only)</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {error.message}
              {error.digest && `\n\ndigest: ${error.digest}`}
            </pre>
          </AlertDescription>
        </Alert>
      )}
    </main>
  );
}
