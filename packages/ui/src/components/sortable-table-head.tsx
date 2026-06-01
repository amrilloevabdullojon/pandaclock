"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "./table";
import { cn } from "../lib/utils";

export type SortDirection = "asc" | "desc";

interface SortableTableHeadProps {
  field: string;
  currentField?: string;
  currentDirection?: SortDirection;
  onSortChange: (field: string, direction: SortDirection) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * <TableHead> с кликом для смены sort. Цикл: asc → desc → asc.
 * Контролируемый — родитель сам хранит state (например через useQueryState).
 */
export function SortableTableHead({
  field,
  currentField,
  currentDirection,
  onSortChange,
  className,
  children,
}: SortableTableHeadProps) {
  const isActive = currentField === field;
  const Icon = isActive ? (currentDirection === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;

  function handleClick(): void {
    const nextDir: SortDirection = isActive && currentDirection === "asc" ? "desc" : "asc";
    onSortChange(field, nextDir);
  }

  return (
    <TableHead className={cn("p-0", className)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "focus-ring -mx-2 flex h-full w-full items-center gap-1.5 rounded-sm px-4 py-2.5 text-left transition-colors",
          "hover:bg-muted/60",
          isActive ? "text-foreground font-bold" : "text-muted-foreground",
        )}
        aria-sort={isActive ? (currentDirection === "desc" ? "descending" : "ascending") : "none"}
      >
        <span>{children}</span>
        <Icon className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-40")} />
      </button>
    </TableHead>
  );
}
