"use client";

import * as React from "react";
import { BarChart3, Check, ChevronLeft, ClipboardList, Plus, Trash2 } from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@pandaclock/ui";
import { usePermission } from "@/lib/session-context";

type QuestionKind = "SCALE_0_10" | "SCALE_1_5" | "CHOICE" | "TEXT";

interface SurveyQuestion {
  id: string;
  text: string;
  kind: string;
  options: string[] | null;
  sortOrder: number;
  required: boolean;
}

interface ActiveSurvey {
  id: string;
  title: string;
  description: string | null;
  type: string;
  anonymous: boolean;
  closesAt: string | null;
  completed: boolean;
}

interface ManagedSurvey {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  anonymous: boolean;
  closesAt: string | null;
  questionCount: number;
  responseCount: number;
  createdAt: string;
}

interface RespondentSurvey {
  id: string;
  title: string;
  description: string | null;
  anonymous: boolean;
  status: string;
  completed: boolean;
  questions: SurveyQuestion[];
}

interface QuestionResult {
  id: string;
  text: string;
  kind: string;
  options: string[] | null;
  answered: number;
  enps?: { promoters: number; passives: number; detractors: number; score: number };
  average?: number;
  distribution?: { label: string; count: number }[];
  texts?: string[];
}

interface SurveyResults {
  surveyId: string;
  title: string;
  anonymous: boolean;
  responseCount: number;
  eligibleCount: number;
  questions: QuestionResult[];
}

const KIND_LABELS: Record<string, string> = {
  SCALE_0_10: "Шкала 0–10 (eNPS)",
  SCALE_1_5: "Оценка 1–5",
  CHOICE: "Выбор варианта",
  TEXT: "Текстовый ответ",
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "success" | "warning" }
> = {
  DRAFT: { label: "Черновик", variant: "secondary" },
  ACTIVE: { label: "Активен", variant: "success" },
  CLOSED: { label: "Закрыт", variant: "warning" },
};

export function SurveysView() {
  const canManage = usePermission("surveys:write");
  return (
    <Tabs defaultValue="take" className="space-y-4">
      <TabsList>
        <TabsTrigger value="take">Пройти</TabsTrigger>
        {canManage ? <TabsTrigger value="manage">Управление</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="take">
        <TakeTab />
      </TabsContent>
      {canManage ? (
        <TabsContent value="manage">
          <ManageTab />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

/* ───────── Прохождение ───────── */

function TakeTab() {
  const [surveys, setSurveys] = React.useState<ActiveSurvey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fillId, setFillId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/surveys/active");
      setSurveys(res.ok ? ((await res.json()) as ActiveSurvey[]) : []);
    } catch {
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (surveys.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Активных опросов нет.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {surveys.map((s) => (
        <div
          key={s.id}
          className="border-border bg-card flex items-start justify-between gap-3 rounded-lg border p-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-foreground font-semibold">{s.title}</p>
              {s.type === "ENPS" ? <Badge variant="info">eNPS</Badge> : null}
              {s.anonymous ? <Badge variant="outline">Анонимно</Badge> : null}
            </div>
            {s.description ? (
              <p className="text-muted-foreground mt-0.5 text-sm">{s.description}</p>
            ) : null}
          </div>
          {s.completed ? (
            <Badge variant="success" className="shrink-0">
              <Check className="mr-1 h-3 w-3" />
              Пройдено
            </Badge>
          ) : (
            <Button size="sm" className="shrink-0" onClick={() => setFillId(s.id)}>
              Пройти
            </Button>
          )}
        </div>
      ))}

      {fillId ? (
        <FillDialog
          surveyId={fillId}
          onClose={() => setFillId(null)}
          onDone={() => {
            setFillId(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function FillDialog({
  surveyId,
  onClose,
  onDone,
}: {
  surveyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [survey, setSurvey] = React.useState<RespondentSurvey | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [answers, setAnswers] = React.useState<
    Record<string, { valueInt?: number; valueText?: string }>
  >({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/surveys/${surveyId}/fill`);
        setSurvey(res.ok ? ((await res.json()) as RespondentSurvey) : null);
      } catch {
        setSurvey(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  function setInt(qid: string, value: number) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], valueInt: value } }));
  }
  function setText(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], valueText: value } }));
  }

  async function submit() {
    if (!survey) return;
    for (const q of survey.questions) {
      if (!q.required) continue;
      const a = answers[q.id];
      const ok = q.kind === "TEXT" ? a?.valueText?.trim() : a?.valueInt !== undefined;
      if (!ok) {
        setError("Ответьте на все обязательные вопросы");
        return;
      }
    }
    setSaving(true);
    setError(null);
    const payload = {
      answers: survey.questions
        .map((q) => ({ questionId: q.id, ...answers[q.id] }))
        .filter((a) => a.valueInt !== undefined || (a.valueText && a.valueText.trim())),
    };
    try {
      const res = await fetch(`/api/surveys/${surveyId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось отправить");
        return;
      }
      toast.success("Спасибо за ответ!");
      onDone();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{survey?.title ?? "Опрос"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        ) : !survey ? (
          <p className="text-muted-foreground text-sm">Опрос недоступен.</p>
        ) : survey.completed ? (
          <p className="text-muted-foreground text-sm">Вы уже прошли этот опрос.</p>
        ) : (
          <div className="space-y-5">
            {survey.description ? (
              <p className="text-muted-foreground text-sm">{survey.description}</p>
            ) : null}
            {survey.questions.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                <Label>
                  {idx + 1}. {q.text}
                  {q.required ? <span className="text-danger"> *</span> : null}
                </Label>
                <QuestionInput
                  question={q}
                  value={answers[q.id]}
                  onInt={(v) => setInt(q.id, v)}
                  onText={(v) => setText(q.id, v)}
                />
              </div>
            ))}
            {error ? (
              <p className="text-danger text-sm font-semibold" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Отмена
              </Button>
              <Button onClick={submit} loading={saving} loadingText="Отправляем…">
                Отправить
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuestionInput({
  question: q,
  value,
  onInt,
  onText,
}: {
  question: SurveyQuestion;
  value: { valueInt?: number; valueText?: string } | undefined;
  onInt: (v: number) => void;
  onText: (v: string) => void;
}) {
  if (q.kind === "SCALE_0_10" || q.kind === "SCALE_1_5") {
    const range =
      q.kind === "SCALE_0_10"
        ? Array.from({ length: 11 }, (_, i) => i)
        : Array.from({ length: 5 }, (_, i) => i + 1);
    return (
      <div className="flex flex-wrap gap-1.5">
        {range.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onInt(n)}
            className={`h-9 w-9 rounded-md border text-sm ${
              value?.valueInt === n
                ? "border-primary bg-primary text-white"
                : "border-border hover:bg-muted text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }
  if (q.kind === "CHOICE") {
    return (
      <div className="space-y-1.5">
        {(q.options ?? []).map((opt, idx) => (
          <label
            key={idx}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              value?.valueInt === idx ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <input
              type="radio"
              name={`q-${q.id}`}
              checked={value?.valueInt === idx}
              onChange={() => onInt(idx)}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  return (
    <textarea
      value={value?.valueText ?? ""}
      onChange={(e) => onText(e.target.value)}
      rows={3}
      className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
      placeholder="Ваш ответ…"
    />
  );
}

/* ───────── Управление ───────── */

function ManageTab() {
  const [surveys, setSurveys] = React.useState<ManagedSurvey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EditableSurvey | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [resultsId, setResultsId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/surveys");
      setSurveys(res.ok ? ((await res.json()) as ManagedSurvey[]) : []);
    } catch {
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (resultsId) {
    return <ResultsPanel surveyId={resultsId} onBack={() => setResultsId(null)} />;
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(status === "ACTIVE" ? "Опрос активирован" : "Опрос закрыт");
      await load();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Опрос удалён");
      await load();
    }
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/surveys/${id}`);
    if (res.ok) {
      setEditing((await res.json()) as EditableSurvey);
      setEditOpen(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Новый опрос
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : surveys.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Опросов пока нет.
        </div>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => {
            const sb = STATUS_BADGE[s.status];
            return (
              <div
                key={s.id}
                className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-semibold">{s.title}</p>
                    <Badge variant={sb?.variant ?? "secondary"}>{sb?.label ?? s.status}</Badge>
                    {s.type === "ENPS" ? <Badge variant="info">eNPS</Badge> : null}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {s.questionCount} вопр. · {s.responseCount} ответов
                  </p>
                </div>
                {s.status === "DRAFT" ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s.id)}>
                      Изменить
                    </Button>
                    <Button size="sm" variant="success" onClick={() => setStatus(s.id, "ACTIVE")}>
                      Активировать
                    </Button>
                  </>
                ) : null}
                {s.status === "ACTIVE" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "CLOSED")}>
                    Закрыть
                  </Button>
                ) : null}
                {s.status !== "DRAFT" ? (
                  <Button size="sm" variant="ghost" onClick={() => setResultsId(s.id)}>
                    <BarChart3 className="h-4 w-4" />
                    Результаты
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CreateSurveyDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={load} />
      <CreateSurveyDialog
        open={editOpen}
        editing={editing}
        onOpenChange={setEditOpen}
        onSaved={load}
      />
    </div>
  );
}

interface EditableSurvey {
  id: string;
  title: string;
  description: string | null;
  anonymous: boolean;
  questions: SurveyQuestion[];
}

interface DraftQuestion {
  text: string;
  kind: QuestionKind;
  optionsText: string;
  required: boolean;
}

function CreateSurveyDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: EditableSurvey | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState("ENPS");
  const [anonymous, setAnonymous] = React.useState(true);
  const [questions, setQuestions] = React.useState<DraftQuestion[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setType("ENPS");
      setAnonymous(editing?.anonymous ?? true);
      setQuestions(
        editing
          ? editing.questions.map((q) => ({
              text: q.text,
              kind: q.kind as QuestionKind,
              optionsText: (q.options ?? []).join("\n"),
              required: q.required,
            }))
          : [
              {
                text: "Насколько вероятно, что вы порекомендуете нашу компанию как место работы?",
                kind: "SCALE_0_10",
                optionsText: "",
                required: true,
              },
            ],
      );
      setError(null);
    }
  }, [open, editing]);

  function addQuestion() {
    setQuestions((p) => [...p, { text: "", kind: "SCALE_1_5", optionsText: "", required: true }]);
  }
  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((p) => p.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function removeQuestion(i: number) {
    setQuestions((p) => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (title.trim().length < 2) {
      setError("Введите название опроса");
      return;
    }
    const prepared = questions
      .map((q) => ({
        text: q.text.trim(),
        kind: q.kind,
        required: q.required,
        options:
          q.kind === "CHOICE"
            ? q.optionsText
                .split("\n")
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
      }))
      .filter((q) => q.text.length > 0);
    if (prepared.length === 0) {
      setError("Добавьте хотя бы один вопрос");
      return;
    }
    for (const q of prepared) {
      if (q.kind === "CHOICE" && (!q.options || q.options.length < 2)) {
        setError("У вопроса с выбором нужно минимум 2 варианта (по одному на строку)");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/surveys/${editing.id}` : "/api/surveys", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          ...(editing ? {} : { type }),
          anonymous,
          questions: prepared,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(
        editing ? "Опрос обновлён" : "Опрос создан (черновик) — активируйте, когда будет готово",
      );
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить опрос" : "Новый опрос"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sv-title">Название</Label>
            <Input
              id="sv-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Опрос вовлечённости Q2"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sv-desc">Описание</Label>
            <textarea
              id="sv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
              placeholder="Пояснение для сотрудников…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="sv-type">Тип</Label>
              <select
                id="sv-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
              >
                <option value="ENPS">eNPS</option>
                <option value="PULSE">Pulse</option>
                <option value="CUSTOM">Произвольный</option>
              </select>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Анонимный
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Вопросы</Label>
              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                Вопрос
              </Button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="border-border space-y-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={q.text}
                    onChange={(e) => updateQuestion(i, { text: e.target.value })}
                    placeholder={`Вопрос ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className="hover:bg-danger-light text-muted-foreground hover:text-danger mt-1.5 rounded p-1"
                    aria-label="Удалить вопрос"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={q.kind}
                    onChange={(e) => updateQuestion(i, { kind: e.target.value as QuestionKind })}
                    className="border-border bg-card focus-ring h-8 rounded-md border px-2 text-sm"
                  >
                    {(Object.keys(KIND_LABELS) as QuestionKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(i, { required: e.target.checked })}
                    />
                    Обязательный
                  </label>
                </div>
                {q.kind === "CHOICE" ? (
                  <textarea
                    value={q.optionsText}
                    onChange={(e) => updateQuestion(i, { optionsText: e.target.value })}
                    rows={3}
                    className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
                    placeholder="Варианты ответа — по одному на строку"
                  />
                ) : null}
              </div>
            ))}
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
            <Button onClick={save} loading={saving} loadingText="Создаём…">
              Создать
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Результаты ───────── */

function ResultsPanel({ surveyId, onBack }: { surveyId: string; onBack: () => void }) {
  const [results, setResults] = React.useState<SurveyResults | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/surveys/${surveyId}/results`);
        setResults(res.ok ? ((await res.json()) as SurveyResults) : null);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!results) return <p className="text-muted-foreground text-sm">Не удалось загрузить.</p>;

  const rate =
    results.eligibleCount > 0
      ? Math.round((results.responseCount / results.eligibleCount) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />К списку
        </Button>
        <h2 className="text-foreground truncate text-lg font-semibold">{results.title}</h2>
      </div>

      <div className="border-border bg-card text-muted-foreground rounded-lg border p-3 text-sm">
        Ответили {results.responseCount} из {results.eligibleCount} ({rate}%)
        {results.anonymous ? " · ответы анонимны" : ""}
      </div>

      <div className="space-y-3">
        {results.questions.map((q, idx) => (
          <div key={q.id} className="border-border bg-card rounded-lg border p-4">
            <p className="text-foreground font-medium">
              {idx + 1}. {q.text}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {KIND_LABELS[q.kind] ?? q.kind} · {q.answered} ответов
            </p>

            {q.enps ? (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-bold ${
                      q.enps.score >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    eNPS {q.enps.score > 0 ? "+" : ""}
                    {q.enps.score}
                  </span>
                  {q.average !== undefined ? (
                    <span className="text-muted-foreground text-sm">средний {q.average}</span>
                  ) : null}
                </div>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                  <Segment count={q.enps.promoters} total={q.answered} className="bg-success" />
                  <Segment count={q.enps.passives} total={q.answered} className="bg-warning" />
                  <Segment count={q.enps.detractors} total={q.answered} className="bg-danger" />
                </div>
                <div className="text-muted-foreground mt-1 flex gap-3 text-xs">
                  <span>Промоутеры {q.enps.promoters}</span>
                  <span>Нейтралы {q.enps.passives}</span>
                  <span>Критики {q.enps.detractors}</span>
                </div>
              </div>
            ) : null}

            {q.distribution ? (
              <div className="mt-3 space-y-1.5">
                {q.average !== undefined ? (
                  <p className="text-muted-foreground text-sm">Средний балл: {q.average}</p>
                ) : null}
                {q.distribution.map((d) => (
                  <DistRow key={d.label} label={d.label} count={d.count} total={q.answered || 1} />
                ))}
              </div>
            ) : null}

            {q.texts ? (
              q.texts.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">Ответов нет.</p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {q.texts.map((t, i) => (
                    <p key={i} className="bg-muted/50 text-foreground rounded-md px-3 py-2 text-sm">
                      {t}
                    </p>
                  ))}
                </div>
              )
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Segment({ count, total, className }: { count: number; total: number; className: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  if (pct === 0) return null;
  return <div className={className} style={{ width: `${pct}%` }} />;
}

function DistRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-28 shrink-0 truncate text-sm">{label}</span>
      <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">{count}</span>
    </div>
  );
}
