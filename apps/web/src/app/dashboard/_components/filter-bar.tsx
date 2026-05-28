"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button, Tag, cn } from "@pandaclock/ui";

export interface ActiveFilter {
  /** Уникальный ключ — обычно имя query param-а. */
  key: string;
  /** Лейбл фильтра (показывается в чипе). */
  label: string;
  /** Колбэк для удаления именно этого чипа. */
  onClear: () => void;
}

interface FilterBarProps {
  /** Slots: левая часть (search input), правая часть (selects/comboboxes). */
  children?: React.ReactNode;
  /** Активные фильтры → рендерятся как chips под контролами. */
  active?: ActiveFilter[];
  /** Сбросить все фильтры разом. Если undefined — кнопка не показывается. */
  onClearAll?: () => void;
  className?: string;
}

/**
 * Универсальный FilterBar для всех списочных страниц.
 *
 * Структура:
 *   ┌──────────────────────────────────────────┐
 *   │ [search]    [select]  [select]  [button] │   ← controls (children)
 *   │ Активные: [chip] [chip] [chip] Сбросить  │   ← active filters (если есть)
 *   └──────────────────────────────────────────┘
 */
export function FilterBar({ children, active, onClearAll, className }: FilterBarProps) {
  const hasActive = active && active.length > 0;

  return (
    <div
      className={cn(
        "border-border bg-card shadow-xs flex flex-col gap-3 rounded-md border p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {hasActive && (
        <div className="border-border flex flex-wrap items-center gap-1.5 border-t pt-3">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Активные:
          </span>
          {active!.map((f) => (
            <Tag key={f.key} tone="primary" size="md" onRemove={f.onClear}>
              {f.label}
            </Tag>
          ))}
          {onClearAll && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClearAll}
              leftIcon={<X className="h-3 w-3" />}
              className="ml-auto"
            >
              Сбросить всё
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
