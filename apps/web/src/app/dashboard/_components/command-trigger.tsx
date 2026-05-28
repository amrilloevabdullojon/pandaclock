"use client";

import { Search } from "lucide-react";
import { cn } from "@pandaclock/ui";
import { useUiStore } from "@/lib/stores/ui-store";

/**
 * Кнопка-триггер для cmd+K палитры (выглядит как поле поиска).
 */
export function CommandTrigger({ className }: { className?: string }) {
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Открыть командную палитру"
      className={cn(
        "border-border bg-muted/60 flex h-9 items-center gap-2 rounded-sm border pl-3 pr-2 text-sm",
        "text-muted-foreground hover:bg-muted hover:text-foreground focus-ring transition-colors",
        "w-full max-w-sm",
        className,
      )}
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Поиск или команда…</span>
      <kbd
        className={cn(
          "border-border bg-card text-muted-foreground pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-semibold",
          "sm:inline-flex",
        )}
      >
        <span className="text-xs">{isMac ? "⌘" : "Ctrl"}</span>K
      </kbd>
    </button>
  );
}
