import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  Calendar,
  FileText,
  MessageCircle,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
  Building2,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Подсказка / описание (используется в Tooltip и cmd+K). */
  description?: string;
  /** Подэлементы — если есть, sidebar разворачивает аккордеон. */
  children?: NavItem[];
  /** Бейдж в сайдбаре справа от названия (число или строка). */
  badge?: string | number;
}

export const NAV: NavItem[] = [
  {
    label: "Дашборд",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Обзор команды и ключевые метрики",
  },
  {
    label: "Сотрудники",
    href: "/dashboard/employees",
    icon: Users,
    description: "Управление командой и приглашения",
  },
  {
    label: "Учёт времени",
    href: "/dashboard/time",
    icon: Clock,
    description: "Клик-ин, опоздания, отчёты по часам",
  },
  {
    label: "Задачи",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    description: "Канбан-доска проектов",
  },
  {
    label: "График",
    href: "/dashboard/calendar",
    icon: Calendar,
    description: "Календарь с отпусками и дедлайнами",
  },
  {
    label: "Заявки",
    href: "/dashboard/requests",
    icon: FileText,
    description: "Отпуска и больничные на одобрении",
  },
  {
    label: "Чаты",
    href: "/dashboard/chats",
    icon: MessageCircle,
    description: "Командные каналы и личные диалоги",
  },
  {
    label: "Отчёты",
    href: "/dashboard/reports",
    icon: BarChart3,
    description: "Аналитика и экспорт в Excel/PDF",
  },
  {
    label: "Уведомления",
    href: "/dashboard/notifications",
    icon: Bell,
    description: "События из задач, заявок и команды",
  },
  {
    label: "Настройки",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Профиль, тариф, отделы",
    children: [
      {
        label: "Профиль",
        href: "/dashboard/profile",
        icon: User,
        description: "Личные данные",
      },
      {
        label: "Отделы",
        href: "/dashboard/departments",
        icon: Building2,
        description: "Иерархия команды",
      },
      {
        label: "Биллинг",
        href: "/dashboard/settings/billing",
        icon: CreditCard,
        description: "Тариф, история платежей",
      },
      {
        label: "Журнал действий",
        href: "/dashboard/settings/audit",
        icon: Shield,
        description: "История изменений (только OWNER/HR)",
      },
    ],
  },
];

/** Плоский список всех ссылок — для cmd+K и breadcrumbs. */
export const NAV_FLAT: NavItem[] = NAV.flatMap((item) =>
  item.children ? [item, ...item.children] : [item],
);
