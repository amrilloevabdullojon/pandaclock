"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Badge, Card } from "@pandaclock/ui";

type Status = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";

interface TaskCard {
  id: string;
  title: string;
  status: Status;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeName: string | null;
  deadline: string | null;
  commentsCount: number;
  labels: string[];
}

const COLUMNS: { id: Status; label: string }[] = [
  { id: "NEW", label: "Новые" },
  { id: "IN_PROGRESS", label: "В работе" },
  { id: "DONE", label: "Готово" },
  { id: "REJECTED", label: "Отклонены" },
];

export function TasksBoard({ initialBoard }: { initialBoard: Record<Status, TaskCard[]> }) {
  const [board, setBoard] = useState(initialBoard);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as Status | undefined;
    if (!newStatus) return;

    let movedTask: TaskCard | undefined;
    let sourceStatus: Status | undefined;
    for (const status of COLUMNS.map((c) => c.id)) {
      const found = board[status].find((t) => t.id === taskId);
      if (found) {
        movedTask = found;
        sourceStatus = status;
        break;
      }
    }
    if (!movedTask || !sourceStatus || sourceStatus === newStatus) return;

    const next: Record<Status, TaskCard[]> = {
      NEW: [...board.NEW],
      IN_PROGRESS: [...board.IN_PROGRESS],
      DONE: [...board.DONE],
      REJECTED: [...board.REJECTED],
    };
    next[sourceStatus] = next[sourceStatus].filter((t) => t.id !== taskId);
    next[newStatus] = [{ ...movedTask, status: newStatus }, ...next[newStatus]];
    setBoard(next);

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) {
      // Откат на оптимистичное обновление.
      setBoard(board);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-4">
        {COLUMNS.map((column) => (
          <Column key={column.id} status={column.id} label={column.label} tasks={board[column.id]} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ status, label, tasks }: { status: Status; label: string; tasks: TaskCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={[
        "rounded-lg border bg-neutral-50 p-3 transition-colors",
        isOver ? "border-primary-500 bg-primary-50" : "border-neutral-200",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-600">{label}</h3>
        <span className="text-xs text-neutral-500">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCardItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskCardItem({ task }: { task: TaskCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate(${String(transform.x)}px, ${String(transform.y)}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
      {...listeners}
      {...attributes}
    >
      <Card>
        <div className="space-y-2 p-3">
          <PriorityBadge priority={task.priority} />
          <Link
            href={`/dashboard/tasks/${task.id}`}
            className="block text-sm font-semibold text-neutral-900 hover:text-primary-500"
          >
            {task.title}
          </Link>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>{task.assigneeName ?? "Без исполнителя"}</span>
            {task.deadline ? (
              <span>
                {new Date(task.deadline).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            ) : null}
          </div>
          {task.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-pill bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                >
                  #{label}
                </span>
              ))}
            </div>
          ) : null}
          {task.commentsCount > 0 ? (
            <p className="text-xs text-neutral-400">💬 {task.commentsCount}</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskCard["priority"] }) {
  if (priority === "URGENT") return <Badge variant="danger">🔥 Срочно</Badge>;
  if (priority === "HIGH") return <Badge variant="warning">Высокий</Badge>;
  if (priority === "MEDIUM") return <Badge variant="secondary">Средний</Badge>;
  return <Badge variant="outline">Низкий</Badge>;
}
