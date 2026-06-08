"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ChevronLeft,
  Mail,
  Phone,
  Plus,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import {
  Badge,
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

export interface DepartmentOption {
  id: string;
  name: string;
}

interface Vacancy {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  description: string | null;
  status: string;
  candidateCount: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  vacancyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string;
  notes: string | null;
  rating: number | null;
  createdAt: string;
}

/** Линейная воронка (REJECTED — отдельная терминальная колонка). */
const PIPELINE = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as const;
const STAGES = [...PIPELINE, "REJECTED"] as const;

const STAGE_LABELS: Record<string, string> = {
  NEW: "Новые",
  SCREENING: "Скрининг",
  INTERVIEW: "Интервью",
  OFFER: "Оффер",
  HIRED: "Приняты",
  REJECTED: "Отказ",
};

export function RecruitmentView({ departments }: { departments: DepartmentOption[] }) {
  const [vacancies, setVacancies] = React.useState<Vacancy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Vacancy | null>(null);

  const loadVacancies = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruitment/vacancies");
      setVacancies(res.ok ? ((await res.json()) as Vacancy[]) : []);
    } catch {
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadVacancies();
  }, [loadVacancies]);

  if (selected) {
    return (
      <CandidatesBoard
        vacancy={selected}
        onBack={() => {
          setSelected(null);
          void loadVacancies();
        }}
      />
    );
  }

  return (
    <VacanciesList
      vacancies={vacancies}
      loading={loading}
      departments={departments}
      onReload={loadVacancies}
      onOpen={setSelected}
    />
  );
}

/* ───────── Список вакансий ───────── */

function VacanciesList({
  vacancies,
  loading,
  departments,
  onReload,
  onOpen,
}: {
  vacancies: Vacancy[];
  loading: boolean;
  departments: DepartmentOption[];
  onReload: () => Promise<void>;
  onOpen: (v: Vacancy) => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Vacancy | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(v: Vacancy) {
    setEditing(v);
    setDialogOpen(true);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/recruitment/vacancies/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Вакансия удалена");
      await onReload();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Новая вакансия
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : vacancies.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Вакансий пока нет. Создайте первую, чтобы начать набор.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {vacancies.map((v) => (
            <div
              key={v.id}
              className="border-border bg-card hover:border-primary group flex flex-col rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(v)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-foreground truncate font-semibold">{v.title}</p>
                  {v.departmentName ? (
                    <p className="text-muted-foreground truncate text-xs">{v.departmentName}</p>
                  ) : null}
                </button>
                <Badge variant={v.status === "OPEN" ? "default" : "secondary"}>
                  {v.status === "OPEN" ? "Открыта" : "Закрыта"}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => onOpen(v)}
                className="text-muted-foreground mt-3 flex items-center gap-1 text-left text-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Кандидатов: {v.candidateCount}
              </button>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onOpen(v)}>
                  Воронка
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>
                  Изменить
                </Button>
                <button
                  type="button"
                  onClick={() => remove(v.id)}
                  className="hover:bg-danger-light text-muted-foreground hover:text-danger ml-auto rounded p-1.5"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VacancyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departments={departments}
        editing={editing}
        onSaved={onReload}
      />
    </div>
  );
}

function VacancyDialog({
  open,
  onOpenChange,
  departments,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: DepartmentOption[];
  editing: Vacancy | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("OPEN");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDepartmentId(editing?.departmentId ?? "");
      setDescription(editing?.description ?? "");
      setStatus(editing?.status ?? "OPEN");
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (title.trim().length < 2) {
      setError("Введите название (минимум 2 символа)");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      departmentId: departmentId || undefined,
      description: description.trim() || undefined,
      ...(editing ? { status } : {}),
    };
    try {
      const res = await fetch(
        editing ? `/api/recruitment/vacancies/${editing.id}` : "/api/recruitment/vacancies",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Вакансия обновлена" : "Вакансия создана");
      onOpenChange(false);
      await onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить вакансию" : "Новая вакансия"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vac-title">Название</Label>
            <Input
              id="vac-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Frontend-разработчик"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vac-dept">Отдел</Label>
            <select
              id="vac-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">— без отдела —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vac-desc">Описание</Label>
            <textarea
              id="vac-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
              placeholder="Требования, обязанности, условия…"
            />
          </div>
          {editing ? (
            <div className="space-y-2">
              <Label htmlFor="vac-status">Статус</Label>
              <select
                id="vac-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="OPEN">Открыта</option>
                <option value="CLOSED">Закрыта</option>
              </select>
            </div>
          ) : null}
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Сохраняем…">
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Воронка кандидатов (kanban) ───────── */

function CandidatesBoard({ vacancy, onBack }: { vacancy: Vacancy; onBack: () => void }) {
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Candidate | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancy.id}/candidates`);
      setCandidates(res.ok ? ((await res.json()) as Candidate[]) : []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [vacancy.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function move(c: Candidate, dir: 1 | -1) {
    const idx = PIPELINE.indexOf(c.stage as (typeof PIPELINE)[number]);
    let nextStage: string;
    if (idx === -1) {
      // из REJECTED возвращаем в NEW
      nextStage = PIPELINE[0];
    } else {
      const next = idx + dir;
      if (next < 0 || next >= PIPELINE.length) return;
      nextStage = PIPELINE[next]!;
    }
    await setStage(c, nextStage);
  }

  async function setStage(c: Candidate, stage: string) {
    setCandidates((prev) => prev.map((x) => (x.id === c.id ? { ...x, stage } : x)));
    const res = await fetch(`/api/recruitment/candidates/${c.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      await load();
      return;
    }
    if (stage === "HIRED") {
      toast.success(`${c.fullName} нанят(а) — создайте сотрудника в разделе «Сотрудники»`);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/recruitment/candidates/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) await load();
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Candidate) {
    setEditing(c);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Все вакансии
        </Button>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-lg font-semibold">{vacancy.title}</h2>
          {vacancy.departmentName ? (
            <p className="text-muted-foreground text-xs">{vacancy.departmentName}</p>
          ) : null}
        </div>
        <Button size="sm" className="ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Кандидат
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const col = candidates.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="bg-muted/40 flex flex-col rounded-lg p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-foreground text-xs font-semibold uppercase tracking-wide">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-muted-foreground text-xs">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((c) => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      onMove={move}
                      onReject={(cd) => setStage(cd, "REJECTED")}
                      onEdit={openEdit}
                      onRemove={remove}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CandidateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vacancyId={vacancy.id}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

function CandidateCard({
  candidate: c,
  onMove,
  onReject,
  onEdit,
  onRemove,
}: {
  candidate: Candidate;
  onMove: (c: Candidate, dir: 1 | -1) => void;
  onReject: (c: Candidate) => void;
  onEdit: (c: Candidate) => void;
  onRemove: (id: string) => void;
}) {
  const idx = PIPELINE.indexOf(c.stage as (typeof PIPELINE)[number]);
  const isRejected = c.stage === "REJECTED";
  return (
    <div className="border-border bg-card rounded-md border p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={() => onEdit(c)}
          className="text-foreground min-w-0 flex-1 truncate text-left text-sm font-medium"
        >
          {c.fullName}
        </button>
        <button
          type="button"
          onClick={() => onRemove(c.id)}
          className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-0.5"
          aria-label="Удалить"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {c.rating ? (
        <div className="mt-1 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${i < c.rating! ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
      ) : null}
      {c.email ? (
        <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
          <Mail className="h-3 w-3 shrink-0" />
          {c.email}
        </p>
      ) : null}
      {c.phone ? (
        <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
          <Phone className="h-3 w-3 shrink-0" />
          {c.phone}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(c, -1)}
          disabled={idx <= 0 && !isRejected}
          className="hover:bg-muted text-muted-foreground rounded p-1 disabled:opacity-30"
          aria-label="Назад"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(c, 1)}
          disabled={idx === PIPELINE.length - 1}
          className="hover:bg-muted text-muted-foreground rounded p-1 disabled:opacity-30"
          aria-label="Дальше"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        {c.stage === "HIRED" ? (
          <Link
            href={`/dashboard/employees?invite=1${c.email ? `&email=${encodeURIComponent(c.email)}` : ""}`}
            className="bg-success-light text-success hover:bg-success/20 ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
            title="Оформить сотрудника"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Оформить
          </Link>
        ) : !isRejected ? (
          <button
            type="button"
            onClick={() => onReject(c)}
            className="hover:bg-danger-light text-muted-foreground hover:text-danger ml-auto rounded p-1"
            aria-label="Отказать"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CandidateDialog({
  open,
  onOpenChange,
  vacancyId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vacancyId: string;
  editing: Candidate | null;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [source, setSource] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setFullName(editing?.fullName ?? "");
      setEmail(editing?.email ?? "");
      setPhone(editing?.phone ?? "");
      setSource(editing?.source ?? "");
      setNotes(editing?.notes ?? "");
      setRating(editing?.rating ?? 0);
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (fullName.trim().length < 2) {
      setError("Введите имя кандидата");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      fullName: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
    };
    try {
      const res = await fetch(
        editing
          ? `/api/recruitment/candidates/${editing.id}`
          : `/api/recruitment/vacancies/${vacancyId}/candidates`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Кандидат обновлён" : "Кандидат добавлен");
      onOpenChange(false);
      await onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить кандидата" : "Новый кандидат"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cand-name">Имя</Label>
            <Input
              id="cand-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иван Иванов"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cand-email">Email</Label>
              <Input
                id="cand-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@mail.ru"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cand-phone">Телефон</Label>
              <Input
                id="cand-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123-45-67"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cand-source">Источник</Label>
            <Input
              id="cand-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="hh.uz, рекомендация, LinkedIn…"
            />
          </div>
          <div className="space-y-2">
            <Label>Оценка</Label>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(rating === i + 1 ? 0 : i + 1)}
                  aria-label={`Оценка ${i + 1}`}
                >
                  <Star
                    className={`h-5 w-5 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cand-notes">Заметки</Label>
            <textarea
              id="cand-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
              placeholder="Впечатления, договорённости…"
            />
          </div>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Сохраняем…">
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
