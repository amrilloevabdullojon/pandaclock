"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditableField, toast } from "@pandaclock/ui";

interface Props {
  taskId: string;
  initial: string;
  /** Если false — рендерим plain text без edit-кнопки. */
  canEdit?: boolean;
}

/**
 * Inline-редактор заголовка задачи (h1).
 * Контролируемое значение хранится локально, после save вызывает router.refresh()
 * чтобы header/breadcrumbs тоже обновились.
 */
export function EditableTaskTitle({ taskId, initial, canEdit = true }: Props) {
  const router = useRouter();
  const [value, setValue] = React.useState(initial);

  if (!canEdit) {
    return <h1 className="text-foreground text-3xl font-extrabold">{value}</h1>;
  }

  async function save(next: string): Promise<void> {
    const trimmed = next.trim();
    if (trimmed.length < 2) {
      toast.error("Заголовок слишком короткий");
      throw new Error("too_short");
    }
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!response.ok) {
      toast.error("Не удалось сохранить");
      throw new Error("save_failed");
    }
    setValue(trimmed);
    toast.success("Сохранено");
    router.refresh();
  }

  return (
    <h1 className="text-foreground text-3xl font-extrabold">
      <EditableField
        value={value}
        onSave={save}
        required
        ariaLabel="Заголовок задачи"
        displayClassName="text-foreground text-3xl font-extrabold"
      />
    </h1>
  );
}
