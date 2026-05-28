export type CalendarEvent = {
  id: string;
  type: "LEAVE_APPROVED" | "LEAVE_PENDING" | "TASK_DEADLINE" | "BIRTHDAY";
  title: string;
  startDate: string;
  endDate: string;
};

export const EVENT_META = {
  LEAVE_APPROVED: {
    label: "Отпуска (утв.)",
    bg: "bg-success-light",
    text: "text-success",
    dot: "bg-success",
    border: "border-success/30",
  },
  LEAVE_PENDING: {
    label: "Отпуска (ждут)",
    bg: "bg-warning-light",
    text: "text-warning",
    dot: "bg-warning",
    border: "border-warning/30",
  },
  TASK_DEADLINE: {
    label: "Дедлайны",
    bg: "bg-primary-50",
    text: "text-primary-700",
    dot: "bg-primary-500",
    border: "border-primary-200",
  },
  BIRTHDAY: {
    label: "Дни рождения",
    bg: "bg-gold-light",
    text: "text-gold-foreground",
    dot: "bg-gold",
    border: "border-gold/30",
  },
} as const;

export const EVENT_TYPES = Object.keys(EVENT_META) as CalendarEvent["type"][];
