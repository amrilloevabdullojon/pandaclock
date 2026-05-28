"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar — обёртка над react-day-picker v10 в стиле shadcn.
 * Используется как DatePicker primitive.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ru}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center text-sm font-semibold",
        nav: "flex items-center gap-1 absolute right-1 top-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-semibold text-[0.7rem] uppercase",
        week: "flex w-full mt-1",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-1",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-9 w-9 p-0 font-normal",
        ),
        selected: "[&_button]:bg-primary-500 [&_button]:text-white [&_button:hover]:bg-primary-600",
        today: "[&_button]:bg-accent [&_button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", chevronClass)} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";
