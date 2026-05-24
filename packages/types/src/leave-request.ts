/** Заявки сотрудников: отпуска, больничные, отгулы. */

export type LeaveType = "VACATION" | "SICK" | "DAY_OFF" | "UNPAID" | "OTHER";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approverComment: string | null;
  decidedAt: Date | null;
  attachments: LeaveAttachment[];
  createdAt: Date;
}

export interface LeaveAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
}
