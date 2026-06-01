"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditableField, toast } from "@pandaclock/ui";

interface Props {
  taskId: string;
  initial: string | null;
  canEdit?: boolean;
}

export function EditableTaskDescription({ taskId, initial, canEdit = true }: Props) {
  const router = useRouter();
  const [value, setValue] = React.useState(initial ?? "");

  if (!canEdit && !value) {
    return <p className="text-muted-foreground text-sm">Без описания.</p>;
  }

  async function save(next: string): Promise<void> {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: next }),
    });
    if (!response.ok) {
      toast.error("Не удалось сохранить");
      throw new Error("save_failed");
    }
    setValue(next);
    toast.success("Сохранено");
    router.refresh();
  }

  return (
    <EditableField
      value={value}
      onSave={save}
      variant="multi"
      placeholder="Добавьте описание задачи…"
      ariaLabel="Описание задачи"
      displayClassName="text-foreground whitespace-pre-wrap text-sm"
    />
  );
}
