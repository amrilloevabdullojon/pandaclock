"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@pandaclock/ui";

const SCOPES = [
  { id: "my", label: "Мои" },
  { id: "team", label: "Команда" },
  { id: "all", label: "Все" },
] as const;

const STATUSES = [
  { id: "PENDING", label: "Ждут", tone: "warning" as const },
  { id: "APPROVED", label: "Утверждены", tone: "success" as const },
  { id: "REJECTED", label: "Отклонены", tone: "danger" as const },
] as const;

const TONE_CLASSES = {
  warning: "bg-warning-light text-warning hover:bg-warning/20",
  success: "bg-success-light text-success hover:bg-success/20",
  danger: "bg-danger-light text-danger hover:bg-danger/20",
} as const;

const ACTIVE_TONE_CLASSES = {
  warning: "bg-warning text-white shadow-sm",
  success: "bg-success text-white shadow-sm",
  danger: "bg-destructive text-destructive-foreground shadow-sm",
} as const;

export function RequestsTabs({
  scope,
  status,
  counts,
}: {
  scope: string;
  status: string | undefined;
  counts: { all: number; pending: number; approved: number; rejected: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setScope(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "my") params.delete("scope");
    else params.set("scope", next);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleStatus(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === next) params.delete("status");
    else params.set("status", next);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={scope} onValueChange={setScope}>
        <TabsList>
          {SCOPES.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
              {s.id === scope && counts.all > 0 && (
                <span className="bg-foreground/10 ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  {counts.all}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const count = counts[s.id.toLowerCase() as "pending" | "approved" | "rejected"];
          const isActive = status === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleStatus(s.id)}
              aria-pressed={isActive}
              className={`focus-ring flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                isActive ? ACTIVE_TONE_CLASSES[s.tone] : TONE_CLASSES[s.tone]
              }`}
            >
              {s.label}
              {count > 0 && (
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
