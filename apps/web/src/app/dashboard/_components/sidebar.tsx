"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, Sparkles } from "lucide-react";
import { cn, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Tag } from "@pandaclock/ui";
import { useUiStore } from "@/lib/stores/ui-store";
import { useSession } from "@/lib/session-context";
import { hasPermission } from "@pandaclock/types";
import { NAV, type NavItem } from "./nav-config";

interface SidebarProps {
  /** Если true — render для mobile drawer (без collapse-кнопки, всегда expanded). */
  variant?: "fixed" | "drawer";
  onItemClick?: () => void;
}

export function Sidebar({ variant = "fixed", onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed) && variant === "fixed";
  const toggleCollapse = useUiStore((s) => s.toggleSidebar);
  const session = useSession();

  // Фильтруем пункты по permission текущего пользователя.
  const visibleNav = React.useMemo(() => {
    const isAllowed = (item: NavItem): boolean => {
      if (!item.permission) return true;
      if (!session) return false;
      if (session.permissions?.length) return session.permissions.includes(item.permission);
      return hasPermission(session.role, item.permission);
    };
    return NAV.map((item) => {
      if (item.children) {
        const kids = item.children.filter(isAllowed);
        return { ...item, children: kids };
      }
      return item;
    }).filter((item) => isAllowed(item) || (item.children && item.children.length > 0));
  }, [session]);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "from-primary-700 to-primary-800 flex h-full flex-col bg-gradient-to-b text-white",
          "ease-out-expo transition-[width] duration-300",
          variant === "fixed" && ["hidden md:flex", collapsed ? "w-20" : "w-64", "shrink-0"],
          variant === "drawer" && "w-full",
        )}
        aria-label="Главная навигация"
      >
        {/* === Logo === */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-white/10",
            collapsed ? "justify-center px-2" : "px-6",
          )}
        >
          <Link
            href="/dashboard"
            onClick={onItemClick}
            className="focus-ring flex items-center gap-2.5 rounded-sm"
            aria-label="Pandaclock"
          >
            <span
              className="shadow-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/15 text-base font-extrabold"
              aria-hidden="true"
            >
              🐼
            </span>
            {!collapsed && (
              <span className="text-base font-extrabold tracking-tight">Pandaclock</span>
            )}
          </Link>
        </div>

        {/* === Nav === */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              onItemClick={onItemClick}
            />
          ))}
        </nav>

        {/* === Upgrade card (только когда не collapsed) === */}
        {!collapsed && (
          <div className="m-3 rounded-md bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Sparkles className="text-gold h-4 w-4" />
              <p className="text-sm font-bold">Pandaclock Pro</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/80">
              KPI, видеосвязь и интеграции для растущих команд
            </p>
            <Link
              href="/dashboard/settings/billing"
              onClick={onItemClick}
              className="text-primary-700 focus-ring mt-3 inline-flex h-8 w-full items-center justify-center rounded-sm bg-white text-xs font-bold hover:bg-white/90"
            >
              Перейти на Pro
            </Link>
          </div>
        )}

        {/* === Collapse toggle (только fixed) === */}
        {variant === "fixed" && (
          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
              className={cn(
                "flex h-9 items-center gap-2 rounded-sm text-xs font-semibold text-white/70 transition-colors",
                "focus-ring hover:bg-white/10 hover:text-white",
                collapsed ? "w-9 justify-center" : "w-full px-3",
              )}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronsLeft className="h-4 w-4" />
                  <span>Свернуть</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

interface NavLinkProps {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onItemClick?: () => void;
  isChild?: boolean;
}

function NavLink({ item, pathname, collapsed, onItemClick, isChild = false }: NavLinkProps) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
    (hasChildren && item.children!.some((c) => pathname.startsWith(c.href)));

  // Группа с дочерними: разворачиваемая (когда не collapsed)
  const [open, setOpen] = React.useState(isActive);
  React.useEffect(() => {
    if (isActive && hasChildren) setOpen(true);
  }, [isActive, hasChildren]);

  if (hasChildren && !collapsed) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "focus-ring flex h-10 w-full items-center gap-3 rounded-sm px-3 text-sm font-semibold transition-colors",
            isActive
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/75 hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Tag tone="primary" size="sm" className="bg-white/20 text-white">
              {item.badge}
            </Tag>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
            {item.children!.map((child) => (
              <NavLink
                key={child.href}
                item={child}
                pathname={pathname}
                collapsed={false}
                onItemClick={onItemClick}
                isChild
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const linkEl = (
    <Link
      href={item.href}
      onClick={onItemClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-ring group relative flex h-10 items-center gap-3 rounded-sm text-sm font-semibold transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        isChild && "h-8 text-[13px] font-medium",
        isActive
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-white" aria-hidden="true" />
      )}
      <Icon className={cn("shrink-0", isChild ? "h-3.5 w-3.5" : "h-4 w-4")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Tag tone="primary" size="sm" className="bg-white/20 text-white">
              {item.badge}
            </Tag>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
        <TooltipContent side="right" className="font-semibold">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return linkEl;
}
