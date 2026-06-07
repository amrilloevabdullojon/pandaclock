"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@pandaclock/ui";

export interface EmployeeOption {
  id: string;
  name: string;
  departmentName: string | null;
  avatarUrl: string | null;
}

interface Shift {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Понедельник недели, содержащей дату d (локальное время). */
function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 6) % 7; // 0 = понедельник
  copy.setDate(copy.getDate() - day);
  return copy;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

interface EditorState {
  shiftId: string | null;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
}

export function ShiftsPlanner({ employees }: { employees: EmployeeOption[] }) {
  const [weekStart, setWeekStart] = React.useState<Date>(() => mondayOf(new Date()));
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editor, setEditor] = React.useState<EditorState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const rangeStart = toIso(days[0]!);
  const rangeEnd = toIso(days[6]!);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?start=${rangeStart}&end=${rangeEnd}`);
      if (res.ok) setShifts((await res.json()) as Shift[]);
      else setShifts([]);
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // userId|date → смены
  const byCell = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const key = `${s.userId}|${s.date}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [shifts]);

  function openCreate(userId: string, date: string) {
    setError(null);
    setEditor({ shiftId: null, userId, date, startTime: "09:00", endTime: "18:00", note: "" });
  }

  function openEdit(s: Shift) {
    setError(null);
    setEditor({
      shiftId: s.id,
      userId: s.userId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      note: s.note ?? "",
    });
  }

  async function save() {
    if (!editor) return;
    if (editor.endTime <= editor.startTime) {
      setError("Конец смены должен быть позже начала");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        userId: editor.userId,
        date: editor.date,
        startTime: editor.startTime,
        endTime: editor.endTime,
        note: editor.note.trim() || null,
      };
      const res = editor.shiftId
        ? await fetch(`/api/shifts/${editor.shiftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/shifts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "Не удалось сохранить смену");
        return;
      }
      toast.success(editor.shiftId ? "Смена обновлена" : "Смена добавлена");
      setEditor(null);
      await load();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editor?.shiftId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shifts/${editor.shiftId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setError("Не удалось удалить");
        return;
      }
      toast.success("Смена удалена");
      setEditor(null);
      await load();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  const todayIso = toIso(new Date());
  const monthLabel = `${days[0]!.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${days[6]!.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-4">
      {/* Навигация по неделям */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() - 7);
            setWeekStart(d);
          }}
          aria-label="Предыдущая неделя"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
          Эта неделя
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + 7);
            setWeekStart(d);
          }}
          aria-label="Следующая неделя"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-foreground ml-2 text-sm font-semibold">{monthLabel}</span>
      </div>

      {employees.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Нет активных сотрудников. Добавьте сотрудников, чтобы планировать смены.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="border-border sticky left-0 z-10 min-w-[180px] border-b border-r bg-inherit p-2 text-left text-xs font-bold uppercase tracking-wider">
                  Сотрудник
                </th>
                {days.map((d) => {
                  const iso = toIso(d);
                  return (
                    <th
                      key={iso}
                      className={`border-border min-w-[120px] border-b border-l p-2 text-center text-xs font-bold ${iso === todayIso ? "text-primary-600" : "text-muted-foreground"}`}
                    >
                      {WEEKDAYS[(d.getDay() + 6) % 7]}{" "}
                      <span className="font-normal">{d.getDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/20">
                  <td className="border-border bg-card sticky left-0 z-10 border-b border-r p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        {emp.avatarUrl ? <AvatarImage src={emp.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-gradient-primary text-[10px] font-bold text-white">
                          {initials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-semibold">{emp.name}</p>
                        {emp.departmentName ? (
                          <p className="text-muted-foreground truncate text-[11px]">
                            {emp.departmentName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const iso = toIso(d);
                    const cell = byCell.get(`${emp.id}|${iso}`) ?? [];
                    return (
                      <td key={iso} className="border-border h-16 border-b border-l p-1 align-top">
                        <div className="flex flex-col gap-1">
                          {cell.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => openEdit(s)}
                              className="bg-primary-50 text-primary-700 hover:bg-primary-100 border-primary-200 rounded border px-1.5 py-1 text-left text-[11px] font-semibold"
                              title={s.note ?? ""}
                            >
                              {s.startTime}–{s.endTime}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => openCreate(emp.id, iso)}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center rounded py-0.5 opacity-0 transition-opacity group-hover:opacity-100 [tr:hover_&]:opacity-100"
                            aria-label="Добавить смену"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading ? <p className="text-muted-foreground text-xs">Загрузка смен…</p> : null}

      {/* Редактор смены */}
      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editor?.shiftId ? "Редактировать смену" : "Новая смена"}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shift-emp">Сотрудник</Label>
                <select
                  id="shift-emp"
                  value={editor.userId}
                  onChange={(e) => setEditor({ ...editor, userId: e.target.value })}
                  className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border px-3 text-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-date">Дата</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={editor.date}
                  onChange={(e) => setEditor({ ...editor, date: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="shift-start">Начало</Label>
                  <Input
                    id="shift-start"
                    type="time"
                    value={editor.startTime}
                    onChange={(e) => setEditor({ ...editor, startTime: e.target.value })}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="shift-end">Конец</Label>
                  <Input
                    id="shift-end"
                    type="time"
                    value={editor.endTime}
                    onChange={(e) => setEditor({ ...editor, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-note">Заметка (необязательно)</Label>
                <Input
                  id="shift-note"
                  value={editor.note}
                  onChange={(e) => setEditor({ ...editor, note: e.target.value })}
                  placeholder="Напр. удалённо / в офисе"
                />
              </div>
              {error ? (
                <p className="text-danger text-sm font-semibold" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                {editor.shiftId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={remove}
                    disabled={saving}
                    className="text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditor(null)}
                    disabled={saving}
                  >
                    Отмена
                  </Button>
                  <Button type="button" onClick={save} loading={saving} loadingText="Сохраняем…">
                    Сохранить
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
