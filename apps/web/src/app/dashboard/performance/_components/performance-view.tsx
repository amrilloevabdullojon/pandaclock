"use client";

import * as React from "react";
import { Pencil, Plus, Star, Target, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@pandaclock/ui";

export interface EmployeeOption {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Goal {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  dueDate: string | null;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  reviewerName: string | null;
  periodLabel: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "В работе",
  DONE: "Достигнута",
  CANCELLED: "Отменена",
};

export function PerformanceView({ employees }: { employees: EmployeeOption[] }) {
  const [filter, setFilter] = React.useState<string>("");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="emp-filter" className="text-muted-foreground text-sm">
          Сотрудник:
        </Label>
        <select
          id="emp-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border-border bg-card focus-ring focus-visible:border-primary-500 h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Все</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Цели</TabsTrigger>
          <TabsTrigger value="reviews">Оценки</TabsTrigger>
        </TabsList>
        <TabsContent value="goals">
          <GoalsTab employees={employees} filter={filter} />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab employees={employees} filter={filter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────── Goals ───────── */

function GoalsTab({ employees, filter }: { employees: EmployeeOption[]; filter: string }) {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editor, setEditor] = React.useState<{
    id: string | null;
    userId: string;
    title: string;
    description: string;
    progress: number;
    status: string;
    dueDate: string;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/goals${filter ? `?userId=${filter}` : ""}`);
      setGoals(res.ok ? ((await res.json()) as Goal[]) : []);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setError(null);
    setEditor({
      id: null,
      userId: filter || employees[0]?.id || "",
      title: "",
      description: "",
      progress: 0,
      status: "ACTIVE",
      dueDate: "",
    });
  }
  function openEdit(g: Goal) {
    setError(null);
    setEditor({
      id: g.id,
      userId: g.userId,
      title: g.title,
      description: g.description ?? "",
      progress: g.progress,
      status: g.status,
      dueDate: g.dueDate ?? "",
    });
  }

  async function save() {
    if (!editor) return;
    if (!editor.title.trim()) {
      setError("Введите название цели");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = editor.id
        ? {
            title: editor.title.trim(),
            description: editor.description.trim() || null,
            progress: editor.progress,
            status: editor.status,
            dueDate: editor.dueDate || null,
          }
        : {
            userId: editor.userId,
            title: editor.title.trim(),
            description: editor.description.trim() || undefined,
            dueDate: editor.dueDate || undefined,
          };
      const res = editor.id
        ? await fetch(`/api/performance/goals/${editor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/performance/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editor.id ? "Цель обновлена" : "Цель добавлена");
      setEditor(null);
      await load();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/performance/goals/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Цель удалена");
      await load();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} disabled={employees.length === 0}>
          <Plus className="h-4 w-4" />
          Новая цель
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : goals.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Target className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Целей пока нет. Создайте первую цель для сотрудника.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <div key={g.id} className="border-border bg-card rounded-lg border p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-foreground font-semibold">{g.title}</p>
                  <p className="text-muted-foreground text-xs">{g.userName}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1"
                    aria-label="Редактировать"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g.id)}
                    className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {g.description ? (
                <p className="text-muted-foreground mb-2 text-sm">{g.description}</p>
              ) : null}
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full ${g.status === "DONE" ? "bg-success" : "bg-primary-500"}`}
                  style={{ width: `${g.progress}%` }}
                />
              </div>
              <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
                <span>{STATUS_LABEL[g.status] ?? g.status}</span>
                <span className="font-semibold">{g.progress}%</span>
              </div>
              {g.dueDate ? (
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Срок: {new Date(g.dueDate).toLocaleDateString("ru-RU")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Редактировать цель" : "Новая цель"}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="space-y-4">
              {!editor.id ? (
                <div className="space-y-2">
                  <Label htmlFor="goal-emp">Сотрудник</Label>
                  <select
                    id="goal-emp"
                    value={editor.userId}
                    onChange={(e) => setEditor({ ...editor, userId: e.target.value })}
                    className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border px-3 text-sm"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="goal-title">Название</Label>
                <Input
                  id="goal-title"
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="Увеличить продажи на 20%"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-desc">Описание (необязательно)</Label>
                <Input
                  id="goal-desc"
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                />
              </div>
              {editor.id ? (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="goal-progress">Прогресс, %</Label>
                    <Input
                      id="goal-progress"
                      type="number"
                      min={0}
                      max={100}
                      value={editor.progress}
                      onChange={(e) =>
                        setEditor({ ...editor, progress: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="goal-status">Статус</Label>
                    <select
                      id="goal-status"
                      value={editor.status}
                      onChange={(e) => setEditor({ ...editor, status: e.target.value })}
                      className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="ACTIVE">В работе</option>
                      <option value="DONE">Достигнута</option>
                      <option value="CANCELLED">Отменена</option>
                    </select>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="goal-due">Срок (необязательно)</Label>
                <Input
                  id="goal-due"
                  type="date"
                  value={editor.dueDate}
                  onChange={(e) => setEditor({ ...editor, dueDate: e.target.value })}
                />
              </div>
              {error ? (
                <p className="text-danger text-sm font-semibold" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>
                  Отмена
                </Button>
                <Button onClick={save} loading={saving} loadingText="Сохраняем…">
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── Reviews ───────── */

function ReviewsTab({ employees, filter }: { employees: EmployeeOption[]; filter: string }) {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editor, setEditor] = React.useState<{
    id: string | null;
    userId: string;
    periodLabel: string;
    rating: number;
    comment: string;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance/reviews${filter ? `?userId=${filter}` : ""}`);
      setReviews(res.ok ? ((await res.json()) as Review[]) : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setError(null);
    setEditor({
      id: null,
      userId: filter || employees[0]?.id || "",
      periodLabel: defaultPeriod(),
      rating: 4,
      comment: "",
    });
  }

  async function save() {
    if (!editor) return;
    if (!editor.periodLabel.trim()) {
      setError("Укажите период");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = editor.id
        ? {
            periodLabel: editor.periodLabel.trim(),
            rating: editor.rating,
            comment: editor.comment.trim() || null,
          }
        : {
            userId: editor.userId,
            periodLabel: editor.periodLabel.trim(),
            rating: editor.rating,
            comment: editor.comment.trim() || undefined,
          };
      const res = editor.id
        ? await fetch(`/api/performance/reviews/${editor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/performance/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editor.id ? "Оценка обновлена" : "Оценка добавлена");
      setEditor(null);
      await load();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/performance/reviews/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Оценка удалена");
      await load();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} disabled={employees.length === 0}>
          <Plus className="h-4 w-4" />
          Новая оценка
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : reviews.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Star className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Оценок пока нет.
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="border-border bg-card flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-semibold">{r.userName}</p>
                  <span className="text-muted-foreground text-xs">· {r.periodLabel}</span>
                </div>
                <div className="my-1 flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                {r.comment ? <p className="text-muted-foreground text-sm">{r.comment}</p> : null}
                {r.reviewerName ? (
                  <p className="text-muted-foreground mt-1 text-[11px]">Оценил: {r.reviewerName}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditor({
                      id: r.id,
                      userId: r.userId,
                      periodLabel: r.periodLabel,
                      rating: r.rating,
                      comment: r.comment ?? "",
                    })
                  }
                  className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1"
                  aria-label="Редактировать"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Редактировать оценку" : "Новая оценка"}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="space-y-4">
              {!editor.id ? (
                <div className="space-y-2">
                  <Label htmlFor="rev-emp">Сотрудник</Label>
                  <select
                    id="rev-emp"
                    value={editor.userId}
                    onChange={(e) => setEditor({ ...editor, userId: e.target.value })}
                    className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border px-3 text-sm"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="rev-period">Период</Label>
                <Input
                  id="rev-period"
                  value={editor.periodLabel}
                  onChange={(e) => setEditor({ ...editor, periodLabel: e.target.value })}
                  placeholder="Q2 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Оценка</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditor({ ...editor, rating: i + 1 })}
                      aria-label={`${i + 1} из 5`}
                    >
                      <Star
                        className={`h-7 w-7 ${i < editor.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-comment">Комментарий (необязательно)</Label>
                <Input
                  id="rev-comment"
                  value={editor.comment}
                  onChange={(e) => setEditor({ ...editor, comment: e.target.value })}
                />
              </div>
              {error ? (
                <p className="text-danger text-sm font-semibold" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>
                  Отмена
                </Button>
                <Button onClick={save} loading={saving} loadingText="Сохраняем…">
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function defaultPeriod(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}
