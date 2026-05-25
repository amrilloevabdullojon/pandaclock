export const TASK_STATUSES = ["NEW", "IN_PROGRESS", "DONE", "REJECTED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Разрешённые переходы между статусами задачи.
 * Любой статус может вернуться в IN_PROGRESS (reopen).
 */
const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  NEW: ["IN_PROGRESS", "REJECTED", "DONE"],
  IN_PROGRESS: ["DONE", "REJECTED", "NEW"],
  DONE: ["IN_PROGRESS"],
  REJECTED: ["IN_PROGRESS", "NEW"],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}
