"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  ScrollArea,
  EmptyState,
  cn,
} from "@pandaclock/ui";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface ListResponse {
  items: NotificationItem[];
  nextCursor: string | null;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Bell с поповером — последние 10 уведомлений.
 * Polling каждые 30 секунд + перезагрузка при открытии popover.
 */
export function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const loadList = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=10", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as ListResponse;
        setItems(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCount = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { count: number };
        setUnread(data.count);
      }
    } catch {
      // молча — не критично
    }
  }, []);

  // Initial + polling unread count
  React.useEffect(() => {
    void loadCount();
    const id = setInterval(() => {
      void loadCount();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadCount]);

  // При открытии — подгружаем актуальный список
  React.useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  async function markRead(id: string) {
    setItems((current) =>
      current.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    setUnread((n) => Math.max(0, n - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => null);
  }

  async function markAll() {
    setItems((current) =>
      current.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    setUnread(0);
    await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
  }

  function handleItemClick(item: NotificationItem) {
    if (!item.readAt) void markRead(item.id);
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Уведомления" className="relative">
          <Bell className="text-muted-foreground h-5 w-5" />
          {unread > 0 && (
            <span
              className="bg-destructive absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white shadow-sm"
              aria-label={`${unread} непрочитанных`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-bold">Уведомления</h3>
            {unread > 0 && (
              <p className="text-muted-foreground text-[11px]">
                {unread} непрочитанн{unread === 1 ? "ое" : "ых"}
              </p>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="xs"
              leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              onClick={markAll}
            >
              Пометить все
            </Button>
          )}
        </div>

        {loading && items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">Загрузка…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              compact
              icon={<Bell />}
              title="Пока ничего нового"
              description="Здесь появятся события из задач, заявок и команды"
            />
          </div>
        ) : (
          <ScrollArea className="h-96">
            <ul className="divide-border divide-y">
              {items.map((n) => {
                const unreadFlag = !n.readAt;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={cn(
                        "hover:bg-muted/60 focus-ring flex w-full gap-3 px-4 py-3 text-left transition-colors",
                        unreadFlag && "bg-accent/40",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          unreadFlag ? "bg-primary-500" : "bg-transparent",
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex-1 space-y-0.5">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            unreadFlag ? "text-foreground font-semibold" : "text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-muted-foreground line-clamp-2 text-xs">{n.body}</p>
                        )}
                        <div className="flex items-center gap-1.5">
                          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                            {formatRelative(n.createdAt)}
                          </p>
                          {n.link && <ExternalLink className="text-muted-foreground h-2.5 w-2.5" />}
                        </div>
                      </div>
                      {unreadFlag && (
                        <span
                          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring self-start rounded-full p-1"
                          aria-label="Пометить прочитанным"
                          onClick={(e) => {
                            e.stopPropagation();
                            void markRead(n.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        <div className="border-border border-t px-4 py-2">
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="text-primary-500 hover:text-primary-700 block text-center text-xs font-semibold"
          >
            Открыть все уведомления →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = diff / 60_000;
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${Math.floor(minutes)} мин назад`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)} ч назад`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)} дн назад`;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}
