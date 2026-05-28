"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, EmptyState } from "@pandaclock/ui";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // В проде здесь будет Sentry/whatever.
    console.error("[dashboard] route error:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <EmptyState
        icon={<AlertTriangle />}
        title="Что-то пошло не так"
        description="Мы уже знаем об ошибке и работаем над ней. Попробуйте обновить страницу — обычно это помогает."
        action={
          <div className="flex gap-2">
            <Button onClick={reset} leftIcon={<RotateCcw className="h-4 w-4" />}>
              Попробовать снова
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (typeof window !== "undefined") window.location.href = "/dashboard";
              }}
            >
              На дашборд
            </Button>
          </div>
        }
      />
      {process.env.NODE_ENV === "development" && (
        <Alert variant="danger">
          <AlertTitle>Detail (dev only)</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {error.message}
              {error.digest && `\n\ndigest: ${error.digest}`}
            </pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
