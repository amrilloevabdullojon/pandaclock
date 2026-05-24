import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  Calendar,
  FileText,
  MessageCircle,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV = [
  { label: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
  { label: "Сотрудники", href: "/dashboard/employees", icon: Users },
  { label: "Учёт времени", href: "/dashboard/time", icon: Clock },
  { label: "Задачи", href: "/dashboard/tasks", icon: CheckSquare },
  { label: "График", href: "/dashboard/calendar", icon: Calendar },
  { label: "Заявки", href: "/dashboard/requests", icon: FileText },
  { label: "Чаты", href: "/dashboard/chats", icon: MessageCircle },
  { label: "Отчёты", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Настройки", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-primary-500 px-4 py-6 text-white md:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-2 px-2 text-lg font-extrabold">
        <span aria-hidden="true">🐼</span>
        Pandaclock
      </Link>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-white/85 hover:bg-primary-600 hover:text-white"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 rounded-lg bg-primary-600 p-4 text-sm">
        <p className="font-semibold">Перейдите на Pro</p>
        <p className="mt-1 text-xs text-white/80">
          KPI, видеосвязь, интеграции для растущих команд.
        </p>
      </div>
    </aside>
  );
}
