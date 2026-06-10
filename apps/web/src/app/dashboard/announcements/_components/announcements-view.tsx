"use client";

import * as React from "react";
import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
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
import { usePermission } from "@/lib/session-context";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorName: string | null;
  read: boolean;
  createdAt: string;
}

export function AnnouncementsView() {
  const canWrite = usePermission("announcements:write");
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Announcement | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements");
      const data = res.ok ? ((await res.json()) as Announcement[]) : [];
      setItems(data);
      // Фоном отмечаем непрочитанные как прочитанные (чтобы сбросить счётчик).
      for (const a of data) {
        if (!a.read) void fetch(`/api/announcements/${a.id}/read`, { method: "POST" });
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Объявление удалено");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Новое объявление
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          <Megaphone className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Объявлений пока нет.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article
              key={a.id}
              className={`border-border bg-card rounded-lg border p-5 ${a.pinned ? "border-primary/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {a.pinned ? <Pin className="text-primary h-4 w-4" /> : null}
                  <h2 className="text-foreground text-lg font-bold">{a.title}</h2>
                  {!a.read ? <Badge variant="info">Новое</Badge> : null}
                </div>
                {canWrite ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(a);
                        setDialogOpen(true);
                      }}
                    >
                      Изменить
                    </Button>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {a.authorName ?? "—"} · {new Date(a.createdAt).toLocaleDateString("ru-RU")}
              </p>
              {a.body ? (
                <p className="text-foreground mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {a.body}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

function AnnouncementDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Announcement | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setBody(editing?.body ?? "");
      setPinned(editing?.pinned ?? false);
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (title.trim().length < 2) {
      setError("Введите заголовок");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/announcements/${editing.id}` : "/api/announcements", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body, pinned }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Объявление обновлено" : "Объявление опубликовано");
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
          <DialogTitle>{editing ? "Изменить объявление" : "Новое объявление"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Заголовок</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Корпоратив в пятницу 🎉"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">Текст</Label>
            <textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="border-border bg-card focus-ring w-full resize-y rounded-md border px-3 py-2 text-sm"
              placeholder="Подробности объявления…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Закрепить вверху
          </label>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Публикуем…">
              {editing ? "Сохранить" : "Опубликовать"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
