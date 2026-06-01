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
import {
  CheckSquare,
  FileText,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Sun,
  User as UserIcon,
  UserCircle,
} from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";
import { NAV_FLAT } from "./nav-config";

interface SearchHit {
  id: string;
  type: "employee" | "task" | "request";
  title: string;
  subtitle: string;
  link: string;
}

interface SearchResponse {
  employees: SearchHit[];
  tasks: SearchHit[];
  requests: SearchHit[];
}

const EMPTY_RESULTS: SearchResponse = { employees: [], tasks: [], requests: [] };

/**
 * Командная палитра (cmd+K / ctrl+K).
 * Глобальный поиск через /api/search + переходы + быстрые действия.
 */
export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResponse>(EMPTY_RESULTS);
  const [searching, setSearching] = React.useState(false);

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

  // Debounced search
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as SearchResponse;
          setResults(data);
        }
      } catch {
        // ignore abort
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Сброс при закрытии
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
    }
  }, [open]);

  function runAndClose(fn: () => void) {
    setOpen(false);
    fn();
  }

  const hasResults = results.employees.length + results.tasks.length + results.requests.length > 0;
  const showSearchGroups = query.trim().length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Поиск или команда…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>
          {searching ? "Ищем…" : showSearchGroups ? "Ничего не найдено." : "Начните печатать…"}
        </CommandEmpty>

        {/* === Реальные результаты поиска === */}
        {showSearchGroups && results.employees.length > 0 && (
          <CommandGroup heading="Сотрудники">
            {results.employees.map((hit) => (
              <CommandItem
                key={`emp-${hit.id}`}
                value={`employee ${hit.title} ${hit.subtitle}`}
                onSelect={() => runAndClose(() => router.push(hit.link))}
              >
                <UserIcon />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{hit.title}</span>
                  <span className="text-muted-foreground truncate text-xs">{hit.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showSearchGroups && results.tasks.length > 0 && (
          <CommandGroup heading="Задачи">
            {results.tasks.map((hit) => (
              <CommandItem
                key={`task-${hit.id}`}
                value={`task ${hit.title} ${hit.subtitle}`}
                onSelect={() => runAndClose(() => router.push(hit.link))}
              >
                <CheckSquare />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{hit.title}</span>
                  <span className="text-muted-foreground truncate text-xs">{hit.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showSearchGroups && results.requests.length > 0 && (
          <CommandGroup heading="Заявки">
            {results.requests.map((hit) => (
              <CommandItem
                key={`req-${hit.id}`}
                value={`request ${hit.title} ${hit.subtitle}`}
                onSelect={() => runAndClose(() => router.push(hit.link))}
              >
                <FileText />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{hit.title}</span>
                  <span className="text-muted-foreground truncate text-xs">{hit.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showSearchGroups && hasResults ? <CommandSeparator /> : null}

        {/* === Навигация === */}
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
