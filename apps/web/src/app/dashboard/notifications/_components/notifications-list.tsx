"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  CheckSquare,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Button, Card, CardContent, Tabs, TabsList, TabsTrigger, cn } from "@pandaclock/ui";

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

interface Props {
  initialItems: NotificationItem[];
  initialCursor: string | null;
  onlyUnread: boolean;
}

const TYPE_META: Record<string, { icon: React.ReactNode; tone: string }> = {
  task_assigned: { icon: <CheckSquare className="h-4 w-4" />, tone: "bg-info-light text-info" },
  task_commented: {
    icon: <MessageSquare className="h-4 w-4" />,
    tone: "bg-primary-50 text-primary-700",
  },
  task_status_changed: {
    icon: <CheckSquare className="h-4 w-4" />,
    tone: "bg-success-light text-success",
  },
  leave_requested: {
    icon: <FileText className="h-4 w-4" />,
    tone: "bg-warning-light text-warning",
  },
  leave_decided: { icon: <FileText className="h-4 w-4" />, tone: "bg-success-light text-success" },
  mention: {
    icon: <MessageSquare className="h-4 w-4" />,
    tone: "bg-primary-50 text-primary-700",
  },
  system: { icon: <Bell className="h-4 w-4" />, tone: "bg-muted text-muted-foreground" },
};

export function NotificationsList({ initialItems, initialCursor, onlyUnread }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  // sync if SSR returned newer data
  React.useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
  }, [initialItems, initialCursor]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "50");
      qs.set("cursor", cursor);
      if (onlyUnread) qs.set("onlyUnread", "true");
      const response = await fetch(`/api/notifications?${qs.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as {
          items: NotificationItem[];
          nextCursor: string | null;
        };
        setItems((current) => [...current, ...data.items]);
        setCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    setItems((current) =>
      current.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => null);
  }

  async function markAll() {
    setItems((current) =>
      current.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
    router.refresh();
  }

  function setTab(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "unread") sp.set("unread", "1");
    else sp.delete("unread");
    const qs = sp.toString();
    router.replace(qs ? `/dashboard/notifications?${qs}` : "/dashboard/notifications");
  }

  const tab = onlyUnread ? "unread" : "all";
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="unread">Непрочитанные</TabsTrigger>
          </TabsList>
        </Tabs>

        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={markAll}
          >
            Пометить все
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-border divide-y">
            {items.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system!;
              const unreadFlag = !n.readAt;
              const Wrapper = (props: React.PropsWithChildren) =>
                n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => unreadFlag && void markRead(n.id)}
                    className="block"
                  >
                    {props.children}
                  </Link>
                ) : (
                  <div>{props.children}</div>
                );

              return (
                <li key={n.id}>
                  <Wrapper>
                    <div
                      className={cn(
                        "hover:bg-muted/40 flex gap-3 px-5 py-4 transition-colors",
                        unreadFlag && "bg-accent/30",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                          meta.tone,
                        )}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start gap-2">
                          {unreadFlag && (
                            <span
                              className="bg-primary-500 mt-2 h-2 w-2 shrink-0 rounded-full"
                              aria-hidden="true"
                            />
                          )}
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              unreadFlag
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground",
                            )}
                          >
                            {n.title}
                          </p>
                        </div>
                        {n.body && (
                          <p className="text-muted-foreground line-clamp-2 text-xs">{n.body}</p>
                        )}
                        <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(n.createdAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {unreadFlag && (
                        <button
                          type="button"
                          aria-label="Пометить прочитанным"
                          onClick={(e) => {
                            e.preventDefault();
                            void markRead(n.id);
                          }}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring self-start rounded-full p-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {cursor && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loading} loadingText="Загружаем…">
            Показать больше
          </Button>
        </div>
      )}
    </div>
  );
}
