/** Задачи и канбан. */

export type TaskStatus = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED" | "OVERDUE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdById: string;
  assigneeId: string | null;
  deadline: Date | null;
  completedAt: Date | null;
  labels: string[];
  attachmentsCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  url: string;
  filename: string;
  size: number;
  uploadedById: string;
  uploadedAt: Date;
}
