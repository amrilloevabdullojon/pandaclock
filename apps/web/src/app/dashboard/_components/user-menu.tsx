"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, User as UserIcon, CreditCard } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@pandaclock/ui";

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Владелец",
  HR: "HR-менеджер",
  MANAGER: "Менеджер",
  EMPLOYEE: "Сотрудник",
};

export function UserMenu({ user }: { user: User | null }) {
  const router = useRouter();
  if (!user) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-sm p-1 pr-2 transition-colors",
          "hover:bg-muted focus-ring",
        )}
        aria-label="Меню пользователя"
      >
        <Avatar className="h-8 w-8">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
          ) : null}
          <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left sm:block">
          <p className="text-foreground text-xs font-bold leading-tight">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-muted-foreground text-[10px] leading-tight">
            {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>
        <ChevronDown className="text-muted-foreground hidden h-4 w-4 sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-sm font-bold">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard/profile")}>
          <UserIcon className="h-4 w-4" />
          Профиль
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
          <Settings className="h-4 w-4" />
          Настройки
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/settings/billing")}>
          <CreditCard className="h-4 w-4" />
          Тариф и оплата
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={logout}>
          <LogOut className="h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
