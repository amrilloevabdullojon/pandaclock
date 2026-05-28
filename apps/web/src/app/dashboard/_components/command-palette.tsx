"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@pandaclock/ui";
import { LogOut, Monitor, Moon, Plus, Sun, UserCircle } from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";
import { NAV_FLAT } from "./nav-config";

/**
 * Командная палитра (cmd+K / ctrl+K).
 * Содержит: переход к разделам, быстрые действия, аккаунт.
 */
export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  function runAndClose(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Поиск по приложению…" />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>

        <CommandGroup heading="Навигация">
          {NAV_FLAT.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.description ?? ""}`}
                onSelect={() => runAndClose(() => router.push(item.href))}
              >
                <Icon />
                <span>{item.label}</span>
                {item.description && (
                  <span className="text-muted-foreground ml-auto truncate text-xs">
                    {item.description}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Быстрые действия">
          <CommandItem
            value="создать задачу новая задача"
            onSelect={() => runAndClose(() => router.push("/dashboard/tasks?new=1"))}
          >
            <Plus />
            <span>Создать задачу</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="пригласить сотрудника invite"
            onSelect={() => runAndClose(() => router.push("/dashboard/employees?invite=1"))}
          >
            <Plus />
            <span>Пригласить сотрудника</span>
          </CommandItem>
          <CommandItem
            value="создать заявку на отпуск"
            onSelect={() => runAndClose(() => router.push("/dashboard/requests?new=1"))}
          >
            <Plus />
            <span>Создать заявку</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Аккаунт">
          <CommandItem
            value="профиль"
            onSelect={() => runAndClose(() => router.push("/dashboard/profile"))}
          >
            <UserCircle />
            <span>Профиль</span>
          </CommandItem>
          <CommandItem
            value="светлая тема light"
            onSelect={() => runAndClose(() => setTheme("light"))}
          >
            <Sun />
            <span>Светлая тема</span>
          </CommandItem>
          <CommandItem
            value="тёмная тема dark mode"
            onSelect={() => runAndClose(() => setTheme("dark"))}
          >
            <Moon />
            <span>Тёмная тема</span>
          </CommandItem>
          <CommandItem
            value="системная тема system auto"
            onSelect={() => runAndClose(() => setTheme("system"))}
          >
            <Monitor />
            <span>Системная тема</span>
          </CommandItem>
          <CommandItem
            value="выйти logout"
            onSelect={() =>
              runAndClose(async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              })
            }
          >
            <LogOut />
            <span>Выйти</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
