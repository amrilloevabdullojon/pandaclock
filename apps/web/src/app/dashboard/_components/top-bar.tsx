"use client";

import { Bell, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@pandaclock/ui";

interface TopBarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <Search className="h-4 w-4" />
        <input
          type="search"
          placeholder="Поиск..."
          className="bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Уведомления"
          className="relative rounded-full p-2 hover:bg-neutral-100"
        >
          <Bell className="h-5 w-5 text-neutral-600" />
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-neutral-500">{user.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-extrabold text-primary-700">
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Выйти
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
