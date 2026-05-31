"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { cn } from "../lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Кастомный fallback. Получает error и reset. */
  fallback?: (params: { error: Error; reset: () => void }) => React.ReactNode;
  /** Когда меняется resetKey — boundary автоматически сбрасывается. */
  resetKey?: unknown;
  /** Колбэк для логирования (Sentry и пр.). */
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
  className?: string;
}

interface State {
  error: Error | null;
}

/**
 * React error boundary для inline-секций dashboard'а — таблица, виджет,
 * чарт. Не используй для целых страниц (для них есть Next.js error.tsx).
 *
 * При крэше показывает компактную карточку «секция не загрузилась» с
 * кнопкой retry. Остальные секции страницы продолжают работать.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, { componentStack: info.componentStack });
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return (
        <div
          role="alert"
          className={cn(
            "border-danger/30 bg-danger-light/40 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center",
            this.props.className,
          )}
        >
          <AlertCircle className="text-danger h-6 w-6" />
          <div>
            <p className="text-foreground text-sm font-bold">Секция не загрузилась</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Что-то пошло не так. Попробуйте обновить.
            </p>
          </div>
          <Button onClick={this.reset} size="sm" variant="outline">
            <RotateCcw className="h-3.5 w-3.5" />
            Повторить
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
