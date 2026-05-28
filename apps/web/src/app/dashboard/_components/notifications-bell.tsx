"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  ScrollArea,
  EmptyState,
  cn,
} from "@pandaclock/ui";

interface Notification {
  id: string;
  title: string;
  description?: string;
  time: string;
  read?: boolean;
  href?: string;
}

interface NotificationsBellProps {
  notifications?: Notification[];
}

/**
 * Звонок-уведомлений с popover-списком последних 10.
 * Пока данные приходят пропсом (заглушка) — позже подключим к API/SSE.
 */
export function NotificationsBell({ notifications = [] }: NotificationsBellProps) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-bold">Уведомления</h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="xs" leftIcon={<CheckCheck className="h-3.5 w-3.5" />}>
              Пометить все
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-6">
            <EmptyState
              compact
              icon={<Bell />}
              title="Пока ничего нового"
              description="Здесь появятся события из задач, заявок и команды"
            />
          </div>
        ) : (
          <ScrollArea className="h-80">
            <ul className="divide-border divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <a
                    href={n.href ?? "#"}
                    className={cn(
                      "hover:bg-muted/60 focus-ring flex gap-3 px-4 py-3 transition-colors",
                      !n.read && "bg-accent/40",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary-500",
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 space-y-0.5">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          n.read ? "text-muted-foreground" : "text-foreground font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.description && (
                        <p className="text-muted-foreground text-xs">{n.description}</p>
                      )}
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        {n.time}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        aria-label="Пометить прочитанным"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring self-start rounded-full p-1"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
