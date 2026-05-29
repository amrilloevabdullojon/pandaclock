"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/* ───────────────────────── Hook ───────────────────────── */

interface UseRowSelectionResult<T = string> {
  selected: Set<T>;
  isSelected: (id: T) => boolean;
  toggle: (id: T) => void;
  selectAll: (ids: T[]) => void;
  clear: () => void;
  count: number;
}

/**
 * Управление выбором строк в таблицах.
 *
 *   const sel = useRowSelection<string>();
 *   <Checkbox checked={sel.isSelected(id)} onCheckedChange={() => sel.toggle(id)} />
 *   sel.selectAll(allIds);
 *   sel.clear();
 */
export function useRowSelection<T = string>(): UseRowSelectionResult<T> {
  const [selected, setSelected] = React.useState<Set<T>>(() => new Set());

  const isSelected = React.useCallback((id: T) => selected.has(id), [selected]);

  const toggle = React.useCallback((id: T) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = React.useCallback((ids: T[]) => {
    setSelected((current) => {
      if (ids.every((id) => current.has(id))) {
        // Все уже выбраны → снимаем выделение
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      }
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clear = React.useCallback(() => setSelected(new Set()), []);

  return { selected, isSelected, toggle, selectAll, clear, count: selected.size };
}

/* ───────────────────────── Toolbar ───────────────────────── */

interface SelectionToolbarProps {
  count: number;
  onClear: () => void;
  children?: React.ReactNode;
  /** Кастомный заголовок вместо "N выбрано". */
  label?: string;
  className?: string;
}

/**
 * Floating bar с тенью, появляется снизу по центру когда count > 0.
 * Внутрь передаём action-кнопки через children.
 *
 * Анимация: opacity 0→1 + translateY 16px→0.
 */
export function SelectionToolbar({
  count,
  onClear,
  children,
  label,
  className,
}: SelectionToolbarProps) {
  if (count === 0) return null;
  const display = label ?? defaultLabel(count);

  return (
    <div
      role="region"
      aria-label={`Действия с ${count} выбранными`}
      className={cn(
        "z-fixed fixed bottom-6 left-1/2 -translate-x-1/2",
        "border-border bg-card flex items-center gap-2 rounded-md border px-3 py-2 shadow-lg",
        "animate-fade-in-up",
        className,
      )}
    >
      <span className="bg-primary-50 text-primary-700 rounded-sm px-2 py-0.5 text-xs font-bold">
        {display}
      </span>
      <span className="bg-border h-5 w-px" aria-hidden="true" />
      {children}
      <span className="bg-border h-5 w-px" aria-hidden="true" />
      <button
        type="button"
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground focus-ring rounded-sm px-2 py-1 text-xs font-semibold"
      >
        Сбросить
      </button>
    </div>
  );
}

function defaultLabel(count: number): string {
  // Простое русское склонение
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} элементов выбрано`;
  if (last === 1) return `${count} элемент выбран`;
  if (last >= 2 && last <= 4) return `${count} элемента выбрано`;
  return `${count} элементов выбрано`;
}
