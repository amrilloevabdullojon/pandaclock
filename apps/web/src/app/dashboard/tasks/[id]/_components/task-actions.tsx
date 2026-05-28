"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardContent } from "@pandaclock/ui";

type Status = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";

const TRANSITIONS: Record<
  Status,
  { status: Status; label: string; variant: "primary" | "success" | "danger" | "secondary" }[]
> = {
  NEW: [
    { status: "IN_PROGRESS", label: "Взять в работу", variant: "primary" },
    { status: "REJECTED", label: "Отклонить", variant: "danger" },
  ],
  IN_PROGRESS: [
    { status: "DONE", label: "✓ Готово", variant: "success" },
    { status: "REJECTED", label: "Отклонить", variant: "danger" },
  ],
  DONE: [{ status: "IN_PROGRESS", label: "Открыть заново", variant: "secondary" }],
  REJECTED: [{ status: "IN_PROGRESS", label: "Восстановить", variant: "secondary" }],
};

export function TaskActions({ taskId, currentStatus }: { taskId: string; currentStatus: Status }) {
  const router = useRouter();
  const [pending, setPending] = useState<Status | null>(null);

  async function transition(to: Status) {
    setPending(to);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-6">
        <h3 className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
          Действия
        </h3>
        {TRANSITIONS[currentStatus].map((action) => (
          <Button
            key={action.status}
            variant={action.variant}
            fullWidth
            disabled={pending !== null}
            onClick={() => transition(action.status)}
          >
            {pending === action.status ? "..." : action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
