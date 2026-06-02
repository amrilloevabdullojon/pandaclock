"use client";

import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type { DateRange };

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
  /** Минимально допустимая дата (например new Date() — нельзя в прошлом). */
  fromDate?: Date;
  /** Сколько месяцев показать рядом. 2 хорошо для range. */
  numberOfMonths?: number;
}

/**
 * Date range picker в одном поле — выбираешь «от» и «до» одним open-state'ом
 * с визуальным выделением диапазона. Использует react-day-picker v10 mode="range".
 *
 * Кнопка показывает компактный диапазон («12–18 июня 2026») когда оба выбраны,
 * только начало (с прочерком) пока выбираешь, или placeholder если ничего нет.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Выберите даты",
  disabled,
  className,
  align = "start",
  fromDate,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
          {renderLabel(value, placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          autoFocus
          disabled={fromDate ? { before: fromDate } : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

function renderLabel(value: DateRange | undefined, placeholder: string): React.ReactNode {
  if (!value?.from) return <span>{placeholder}</span>;
  if (!value.to) {
    return (
      <>
        {format(value.from, "d MMM", { locale: ru })} — <span className="opacity-60">…</span>
      </>
    );
  }
  const sameMonth =
    value.from.getMonth() === value.to.getMonth() &&
    value.from.getFullYear() === value.to.getFullYear();
  if (sameMonth) {
    return (
      <>
        {format(value.from, "d", { locale: ru })}–{format(value.to, "d MMMM yyyy", { locale: ru })}
      </>
    );
  }
  return (
    <>
      {format(value.from, "d MMM", { locale: ru })} —{" "}
      {format(value.to, "d MMM yyyy", { locale: ru })}
    </>
  );
}
