"use client";

import * as React from "react";
import { Check, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, ScrollArea, cn } from "@pandaclock/ui";

export interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  /** Уже выбранные id (для отображения чипсов / disabled-чекбоксов в списке). */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Если true — только один пользователь (для DM). */
  single?: boolean;
  /** id'ы, которые нельзя выбрать (например, текущий юзер для DM или уже-членов канала). */
  excludeIds?: string[];
  /** Максимальная высота списка. */
  maxHeight?: number;
}

/**
 * Поиск + выбор сотрудников с avatar/имя. Загружает /api/employees один раз
 * на mount и фильтрует локально (для тенантов до ~500 чел. достаточно).
 *
 * single=true → ограничивает selectedIds до одного элемента; используется
 * в диалоге создания DM.
 */
export function UserPicker({
  selectedIds,
  onChange,
  single = false,
  excludeIds = [],
  maxHeight = 320,
}: Props) {
  const [all, setAll] = React.useState<EmployeeOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/employees?pageSize=500");
        if (!response.ok) return;
        const data = (await response.json()) as {
          items: EmployeeOption[];
        };
        if (!cancelled) setAll(data.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((u) => !excludeIds.includes(u.id))
      .filter((u) =>
        !q
          ? true
          : `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
      );
  }, [all, excludeIds, search]);

  function toggle(id: string): void {
    if (single) {
      onChange(selectedIds[0] === id ? [] : [id]);
      return;
    }
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  }

  function removeChip(id: string): void {
    onChange(selectedIds.filter((x) => x !== id));
  }

  const selectedSet = new Set(selectedIds);
  const selectedUsers = selectedIds
    .map((id) => all.find((u) => u.id === id))
    .filter((u): u is EmployeeOption => !!u);

  return (
    <div className="space-y-2">
      {/* Чипсы выбранных */}
      {selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="bg-primary-50 text-primary-700 rounded-pill inline-flex items-center gap-1.5 py-1 pl-1 pr-2 text-xs font-semibold"
            >
              <Avatar className="h-5 w-5">
                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-primary-500 text-[9px] text-white">
                  {initials(u.firstName, u.lastName)}
                </AvatarFallback>
              </Avatar>
              {u.firstName} {u.lastName}
              <button
                type="button"
                onClick={() => removeChip(u.id)}
                aria-label="Убрать"
                className="hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Поиск */}
      <div className="border-border bg-card focus-within:border-primary-500 flex items-center gap-2 rounded-md border px-3 py-1.5">
        <Search className="text-muted-foreground h-4 w-4 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или email…"
          className="placeholder:text-muted-foreground w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      {/* Список */}
      <ScrollArea className="border-border rounded-md border" style={{ height: maxHeight }}>
        {loading ? (
          <p className="text-muted-foreground p-4 text-center text-sm">Загрузка…</p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            {search ? "Никого не найдено" : "Список пуст"}
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {visible.map((u) => {
              const checked = selectedSet.has(u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => toggle(u.id)}
                    className={cn(
                      "hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      checked && "bg-primary-50",
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                        {initials(u.firstName, u.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-semibold">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                    </div>
                    {checked ? <Check className="text-primary-500 h-4 w-4 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function initials(first: string, last: string): string {
  return `${first.charAt(0) ?? ""}${last.charAt(0) ?? ""}`.toUpperCase();
}
