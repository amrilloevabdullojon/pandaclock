"use client";

import * as React from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Checkbox, Input, toast } from "@pandaclock/ui";

interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
}

/**
 * Чек-лист subtasks под задачей.
 *
 * Изначальный список приходит с сервера через page.tsx. Дальше:
 *  - toggle done — PATCH /tasks/:id/subtasks/:sid + оптимистично обновляем
 *  - add — POST + push в конец
 *  - delete — DELETE + filter
 *  - rename inline — двойной клик / по нажатию иконки (упрощено: только новый текст)
 *
 * Reorder через drag-drop пока не делаем — для MVP достаточно текущей сортировки
 * по position (новые в конце).
 */
export function SubtasksList({ taskId, initial }: { taskId: string; initial: Subtask[] }) {
  const [items, setItems] = React.useState<Subtask[]>(initial);
  const [draft, setDraft] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;

  async function addSubtask(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed.length < 1) return;
    setAdding(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) {
        toast.error("Не удалось добавить");
        return;
      }
      const created = (await response.json()) as Subtask;
      setItems((prev) => [...prev, created]);
      setDraft("");
    } catch {
      toast.error("Нет связи с сервером");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(subtask: Subtask): Promise<void> {
    const next = !subtask.done;
    // Оптимистично обновляем
    setItems((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, done: next } : s)));
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      });
      if (!response.ok) throw new Error("PATCH failed");
    } catch {
      // Откат
      setItems((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, done: subtask.done } : s)));
      toast.error("Не удалось сохранить");
    }
  }

  async function remove(subtask: Subtask): Promise<void> {
    const previous = items;
    setItems((prev) => prev.filter((s) => s.id !== subtask.id));
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "DELETE",
      });
      if (response.status !== 204) throw new Error("DELETE failed");
    } catch {
      setItems(previous);
      toast.error("Не удалось удалить");
    }
  }

  async function rename(subtask: Subtask, title: string): Promise<void> {
    const trimmed = title.trim();
    if (trimmed.length < 1 || trimmed === subtask.title) return;
    setItems((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, title: trimmed } : s)));
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) throw new Error("PATCH failed");
    } catch {
      setItems((prev) =>
        prev.map((s) => (s.id === subtask.id ? { ...s, title: subtask.title } : s)),
      );
      toast.error("Не удалось переименовать");
    }
  }

  return (
    <div className="space-y-3">
      {total > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs font-semibold">
            {doneCount} / {total} выполнено
          </span>
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary-500 h-full rounded-full transition-all"
              style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((s) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              onToggle={() => toggle(s)}
              onDelete={() => remove(s)}
              onRename={(t) => rename(s, t)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Пока нет подзадач.</p>
      )}

      {/* Add new */}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addSubtask();
            }
          }}
          placeholder="Новая подзадача…"
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={addSubtask}
          disabled={!draft.trim() || adding}
          loading={adding}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SubtaskRow({
  subtask,
  onToggle,
  onDelete,
  onRename,
}: {
  subtask: Subtask;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(subtask.title);

  React.useEffect(() => {
    if (!editing) setDraft(subtask.title);
  }, [subtask.title, editing]);

  function commitRename(): void {
    setEditing(false);
    onRename(draft);
  }

  return (
    <li className="bg-muted hover:bg-primary-50 group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors">
      <Checkbox
        checked={subtask.done}
        onCheckedChange={onToggle}
        aria-label={subtask.done ? "Снять отметку" : "Отметить выполненной"}
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            } else if (e.key === "Escape") {
              setEditing(false);
              setDraft(subtask.title);
            }
          }}
          className="text-foreground bg-card border-border focus:border-primary-500 flex-1 rounded border px-2 py-1 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 text-left text-sm ${
            subtask.done ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {subtask.title}
        </button>
      )}
      {subtask.done ? <Check className="text-success h-4 w-4 shrink-0" /> : null}
      <button
        type="button"
        onClick={onDelete}
        className="text-muted-foreground hover:text-danger p-1 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Удалить «${subtask.title}»`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
