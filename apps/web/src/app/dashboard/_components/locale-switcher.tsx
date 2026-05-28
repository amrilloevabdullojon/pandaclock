"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Globe } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
} from "@pandaclock/ui";

const OPTIONS = [
  { value: "ru", flag: "🇷🇺", label: "Русский" },
  { value: "uz-latn", flag: "🇺🇿", label: "O'zbekcha" },
  { value: "en", flag: "🇬🇧", label: "English" },
];

function readLocale(): string {
  if (typeof document === "undefined") return "ru";
  const match = document.cookie.match(/(?:^|;\s*)pcl_locale=([^;]+)/);
  return match?.[1] ?? "ru";
}

export function LocaleSwitcher({ current }: { current?: string } = {}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "ru");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!current) setValue(readLocale());
  }, [current]);

  function change(next: string) {
    if (next === value) return;
    setValue(next);
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Язык: ${active.label}`} disabled={pending}>
          {pending ? (
            <Spinner size="sm" />
          ) : (
            <span className="flex items-center gap-1">
              <Globe className="text-muted-foreground h-4 w-4" />
              <span className="text-xs">{active.flag}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Язык интерфейса</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => change(o.value)}
            className={value === o.value ? "bg-accent text-accent-foreground" : undefined}
          >
            <span className="text-base">{o.flag}</span>
            <span>{o.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
