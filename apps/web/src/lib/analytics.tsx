"use client";

import * as React from "react";
import posthog from "posthog-js";
import { PostHogProvider as RawProvider } from "posthog-js/react";
import { usePathname } from "next/navigation";
import { useSession } from "./session-context";

/**
 * Аналитика на PostHog.
 *
 * Opt-in: если NEXT_PUBLIC_POSTHOG_KEY не задан, провайдер ничего не делает.
 * Никаких событий не шлётся, fetch'и не происходят.
 *
 * События, которые мы отслеживаем:
 *  - $pageview (автоматически по pathname)
 *  - identify({ role }) при логине, reset при выходе
 *  - кастомные через useAnalytics().track("event_name", { ...props })
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialized = false;

function ensureInit(): boolean {
  if (typeof window === "undefined") return false;
  if (!POSTHOG_KEY) return false;
  if (initialized) return true;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // мы делаем это руками по pathname
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    disable_session_recording: true,
    autocapture: false, // без autocapture — только осознанные события
  });
  initialized = true;
  return true;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const ready = ensureInit();
  if (!ready) return <>{children}</>;
  return <RawProvider client={posthog}>{children}</RawProvider>;
}

/**
 * Автоматически шлёт $pageview при смене pathname.
 * Кладётся в dashboard/layout.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  React.useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.capture("$pageview", { $current_url: pathname });
  }, [pathname]);
  return null;
}

/**
 * Identify пользователя в PostHog при наличии сессии.
 * Шлёт role, НО не email/имя (PII).
 */
export function IdentifyUser() {
  const session = useSession();
  React.useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (session?.id) {
      posthog.identify(session.id, { role: session.role });
    } else {
      posthog.reset();
    }
  }, [session?.id, session?.role]);
  return null;
}

/**
 * Хук для трекинга кастомных событий из компонентов.
 *
 *   const { track } = useAnalytics();
 *   track("invite_sent", { count: 5 });
 */
export function useAnalytics() {
  return React.useMemo(
    () => ({
      track(event: string, props?: Record<string, unknown>) {
        if (!POSTHOG_KEY) return;
        posthog.capture(event, props);
      },
    }),
    [],
  );
}
