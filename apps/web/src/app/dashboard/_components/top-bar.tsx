"use client";

import { Separator } from "@pandaclock/ui";
import { CommandTrigger } from "./command-trigger";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface TopBarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  tenantSlug?: string | null;
}

export function TopBar({ user, tenantSlug }: TopBarProps) {
  return (
    <header
      className="z-sticky border-border bg-card/85 supports-[backdrop-filter]:bg-card/70 sticky top-0 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6"
      role="banner"
    >
      <MobileNav />

      <div className="flex-1">
        <CommandTrigger />
      </div>

      <div className="flex items-center gap-1.5">
        {tenantSlug && (
          <span className="bg-muted/60 text-muted-foreground hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:inline-flex">
            <span className="bg-success h-1.5 w-1.5 rounded-full" aria-hidden="true" />
            <span className="font-mono">{tenantSlug}</span>
          </span>
        )}
        <ThemeToggle />
        <LocaleSwitcher />
        <NotificationsBell />
        <Separator orientation="vertical" className="mx-1 hidden h-8 sm:block" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
