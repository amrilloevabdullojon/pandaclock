/** Учёт рабочего времени. */

export type TimeEntryStatus = "WORKING" | "BREAK" | "FINISHED";

export interface TimeEntry {
  id: string;
  userId: string;
  date: Date;
  startedAt: Date;
  finishedAt: Date | null;
  status: TimeEntryStatus;
  totalMinutes: number | null;
  breaksTotalMinutes: number;
  ipAddress: string | null;
  startLocation: GeoPoint | null;
  finishLocation: GeoPoint | null;
  isLate: boolean;
  note: string | null;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface Break {
  id: string;
  timeEntryId: string;
  startedAt: Date;
  finishedAt: Date | null;
  type: "LUNCH" | "TECHNICAL" | "PERSONAL";
}
