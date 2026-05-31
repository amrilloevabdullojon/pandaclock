"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
} from "@pandaclock/ui";

interface DepartmentOption {
  id: string;
  name: string;
}

interface Props {
  /** Существующие отделы — для выбора parent в dropdown. */
  options: DepartmentOption[];
  /** Кастомный триггер; если не передан — нарисуется обычная кнопка. */
  trigger?: React.ReactNode;
}

/**
 * Inline-форма создания отдела.
 *
 * Используется как из EmptyState (когда отделов 0) — так и из header страницы.
 * Минимальный набор полей: name (обязательно) + parent (опционально для дочерних).
 */
export function CreateDepartment({ options, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Введите название отдела");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parentId: parentId || null,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        setError(body.message ?? "Не удалось создать отдел");
        return;
      }
      toast.success(`Отдел «${name.trim()}» создан`);
      setName("");
      setParentId("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Создать отдел
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый отдел</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dept-name">Название</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Разработка"
              autoFocus
              required
            />
          </div>
          {options.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="dept-parent">Родительский отдел (необязательно)</Label>
              <select
                id="dept-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">— без родителя —</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button type="submit" loading={submitting} loadingText="Создаём…">
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
