"use client";

import * as React from "react";
import { CheckCircle2, Circle, FileText, ListChecks, Plus, Trash2, Users } from "lucide-react";
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
}

interface ChecklistItem {
  id: string;
  userId: string;
  kind: string;
  title: string;
  done: boolean;
  doneAt: string | null;
}

interface HrDocument {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  totalRecipients: number;
  acknowledged: number;
}

export function HrView({ employees }: { employees: EmployeeOption[] }) {
  return (
    <Tabs defaultValue="onboarding" className="space-y-4">
      <TabsList>
        <TabsTrigger value="onboarding">Адаптация</TabsTrigger>
        <TabsTrigger value="documents">Документы (ЭДО)</TabsTrigger>
      </TabsList>
      <TabsContent value="onboarding">
        <OnboardingTab employees={employees} />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentsTab employees={employees} />
      </TabsContent>
    </Tabs>
  );
}

/* ───────── Адаптация ───────── */

function OnboardingTab({ employees }: { employees: EmployeeOption[] }) {
  const [userId, setUserId] = React.useState(employees[0]?.id ?? "");
  const [kind, setKind] = React.useState("ONBOARDING");
  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/onboarding?userId=${userId}&kind=${kind}`);
      setItems(res.ok ? ((await res.json()) as ChecklistItem[]) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, kind]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: ChecklistItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await fetch(`/api/hr/onboarding/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
  }

  async function add() {
    if (!newTitle.trim() || !userId) return;
    const res = await fetch("/api/hr/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, kind, title: newTitle.trim() }),
    });
    if (res.ok) {
      setNewTitle("");
      await load();
    }
  }

  async function seed() {
    const res = await fetch("/api/hr/onboarding/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, kind }),
    });
    if (res.ok) {
      toast.success("Стандартный чек-лист добавлен");
      await load();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/hr/onboarding/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) await load();
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
        >
          <option value="ONBOARDING">Приём (онбординг)</option>
          <option value="OFFBOARDING">Увольнение (офбординг)</option>
        </select>
        {items.length === 0 ? (
          <Button size="sm" variant="outline" onClick={seed} disabled={!userId}>
            <ListChecks className="h-4 w-4" />
            Стандартный чек-лист
          </Button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Выполнено {doneCount} из {items.length}
        </p>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Чек-лист пуст. Добавьте стандартный набор или свои пункты.
        </div>
      ) : (
        <div className="border-border divide-border bg-card divide-y rounded-lg border">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 p-3">
              <button type="button" onClick={() => toggle(i)} aria-label="Отметить">
                {i.done ? (
                  <CheckCircle2 className="text-success h-5 w-5" />
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${i.done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {i.title}
              </span>
              <button
                type="button"
                onClick={() => remove(i.id)}
                className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1"
                aria-label="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="Новый пункт чек-листа…"
          disabled={!userId}
        />
        <Button onClick={add} disabled={!newTitle.trim() || !userId}>
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>
    </div>
  );
}

/* ───────── Документы (ЭДО) ───────── */

function DocumentsTab({ employees }: { employees: EmployeeOption[] }) {
  const [docs, setDocs] = React.useState<HrDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [recipients, setRecipients] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/documents");
      setDocs(res.ok ? ((await res.json()) as HrDocument[]) : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!title.trim()) {
      setError("Введите заголовок");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          recipientIds: recipients.size > 0 ? Array.from(recipients) : undefined,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось создать");
        return;
      }
      toast.success("Документ отправлен на ознакомление");
      setCreating(false);
      setTitle("");
      setBody("");
      setRecipients(new Set());
      await load();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/hr/documents/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Документ удалён");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Новый документ
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : docs.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Документов пока нет.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div
              key={d.id}
              className="border-border bg-card flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <p className="text-foreground font-semibold">{d.title}</p>
                {d.body ? (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">{d.body}</p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  Ознакомились: {d.acknowledged} из {d.totalRecipients} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1"
                aria-label="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый кадровый документ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Заголовок</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Приказ №12 о…"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-body">Текст</Label>
              <textarea
                id="doc-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
                placeholder="Содержание приказа / заявления…"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Кому ({recipients.size === 0 ? "всем сотрудникам" : `выбрано ${recipients.size}`})
              </Label>
              <div className="border-border max-h-40 overflow-y-auto rounded-md border p-2">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={recipients.has(e.id)}
                      onChange={(ev) => {
                        setRecipients((prev) => {
                          const next = new Set(prev);
                          if (ev.target.checked) next.add(e.id);
                          else next.delete(e.id);
                          return next;
                        });
                      }}
                    />
                    {e.name}
                  </label>
                ))}
              </div>
            </div>
            {error ? (
              <p className="text-danger text-sm font-semibold" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
                Отмена
              </Button>
              <Button onClick={create} loading={saving} loadingText="Отправляем…">
                Отправить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
