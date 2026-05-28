"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger } from "@pandaclock/ui";

interface CalendarToolbarProps {
  view: "month" | "agenda";
  monthLabel: string;
  prev: { y: number; m: number };
  next: { y: number; m: number };
  today: { y: number; m: number };
}

export function CalendarToolbar({ view, monthLabel, prev, next, today }: CalendarToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "month") params.delete("view");
    else params.set("view", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function buildHref(y: number, m: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("y", String(y));
    params.set("m", String(m));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Предыдущий месяц">
          <Link href={buildHref(prev.y, prev.m)}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-foreground min-w-44 text-center text-base font-bold capitalize">
          {monthLabel}
        </span>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Следующий месяц">
          <Link href={buildHref(next.y, next.m)}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="ml-2">
          <Link href={buildHref(today.y, today.m)}>Сегодня</Link>
        </Button>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="month">Месяц</TabsTrigger>
          <TabsTrigger value="agenda">Список</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
