"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flame, GripVertical, MessageCircle, MoreHorizontal, Tag as TagIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tag,
  cn,
  toast,
} from "@pandaclock/ui";

type Status = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskCard {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assigneeName: string | null;
  deadline: string | null;
  commentsCount: number;
  labels: string[];
}

const COLUMNS: { id: Status; label: string; tone: string; ring: string }[] = [
  { id: "NEW", label: "Новые", tone: "bg-neutral-400", ring: "ring-neutral-300" },
  { id: "IN_PROGRESS", label: "В работе", tone: "bg-info", ring: "ring-info/40" },
  { id: "DONE", label: "Готово", tone: "bg-success", ring: "ring-success/40" },
  { id: "REJECTED", label: "Отклонены", tone: "bg-destructive", ring: "ring-destructive/40" },
];

const PRIORITY_BAR: Record<Priority, string> = {
  URGENT: "bg-destructive",
  HIGH: "bg-warning",
  MEDIUM: "bg-info",
  LOW: "bg-neutral-300",
};

type Board = Record<Status, TaskCard[]>;

export function TasksBoard({ initialBoard }: { initialBoard: Board }) {
  const [board, setBoard] = React.useState<Board>(initialBoard);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = React.useMemo(() => {
    if (!activeId) return null;
    for (const col of COLUMNS) {
      const found = board[col.id].find((t) => t.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, board]);

  function findColumn(taskId: string): Status | null {
    for (const col of COLUMNS) {
      if (board[col.id].some((t) => t.id === taskId)) return col.id;
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);

    const sourceCol = findColumn(taskId);
    if (!sourceCol) return;

    // Drop на колонку (overId = Status) или на другую задачу (overId = taskId).
    const targetCol = (COLUMNS.find((c) => c.id === overId)?.id ??
      findColumn(overId)) as Status | null;
    if (!targetCol) return;

    const snapshot = board;
    let next: Board;

    if (sourceCol === targetCol) {
      const oldIndex = board[sourceCol].findIndex((t) => t.id === taskId);
      const newIndex = board[targetCol].findIndex((t) => t.id === overId);
      if (oldIndex === newIndex || newIndex === -1) return;
      next = {
        ...board,
        [sourceCol]: arrayMove(board[sourceCol], oldIndex, newIndex),
      };
    } else {
      const movedIdx = board[sourceCol].findIndex((t) => t.id === taskId);
      const moved = board[sourceCol][movedIdx];
      if (!moved) return;
      const insertIdx = board[targetCol].findIndex((t) => t.id === overId);
      const targetList = [...board[targetCol]];
      const insertAt = insertIdx === -1 ? targetList.length : insertIdx;
      targetList.splice(insertAt, 0, { ...moved, status: targetCol });
      next = {
        ...board,
        [sourceCol]: board[sourceCol].filter((t) => t.id !== taskId),
        [targetCol]: targetList,
      };
    }

    setBoard(next);

    if (sourceCol !== targetCol) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetCol }),
        });
        if (!response.ok) throw new Error("save failed");
        toast.success(`Перенесено: ${COLUMNS.find((c) => c.id === targetCol)?.label}`);
      } catch {
        setBoard(snapshot);
        toast.error("Не удалось сохранить — изменения отменены");
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            status={column.id}
            label={column.label}
            tone={column.tone}
            ring={column.ring}
            tasks={board[column.id]}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {activeTask ? <TaskCardContent task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

interface ColumnProps {
  status: Status;
  label: string;
  tone: string;
  ring: string;
  tasks: TaskCard[];
}

function Column({ status, label, tone, ring, tasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex flex-col gap-3 rounded-md border p-3 transition-all",
        isOver ? `ring-2 ${ring} bg-accent/30 border-transparent` : "border-border",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", tone)} aria-hidden="true" />
          <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">{label}</h3>
          <span className="bg-card text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[80px] flex-col gap-2">
          {tasks.length === 0 ? (
            <div className="border-border bg-card/40 flex flex-1 items-center justify-center rounded-sm border border-dashed py-8">
              <p className="text-muted-foreground text-xs">Перетащите сюда</p>
            </div>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({ task }: { task: TaskCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCardContent task={task} dragHandleProps={listeners} />
    </div>
  );
}

interface TaskCardContentProps {
  task: TaskCard;
  dragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function TaskCardContent({ task, dragging, dragHandleProps }: TaskCardContentProps) {
  const deadline = formatDeadline(task.deadline);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden",
        dragging && "ring-primary-500/30 rotate-1 shadow-xl ring-2",
      )}
    >
      <span
        className={cn("absolute left-0 top-0 h-full w-1", PRIORITY_BAR[task.priority])}
        aria-hidden="true"
      />
      <div className="space-y-2 p-3 pl-4">
        <div className="flex items-start justify-between gap-1">
          <Link
            href={`/dashboard/tasks/${task.id}`}
            className="rounded-xs text-foreground hover:text-primary-600 focus-ring flex-1 text-sm font-semibold leading-snug"
          >
            {task.title}
          </Link>
          <div className="flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring flex h-6 w-6 items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label="Действия"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/tasks/${task.id}`}>Открыть</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive disabled>
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              aria-label="Перетащить"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 cursor-grab items-center justify-center rounded-sm opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {(task.priority === "URGENT" || task.labels.length > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {task.priority === "URGENT" && (
              <Tag tone="danger" size="sm">
                <Flame className="h-3 w-3" /> Срочно
              </Tag>
            )}
            {task.labels.slice(0, 3).map((label) => (
              <Tag key={label} tone="neutral" size="sm">
                <TagIcon className="h-2.5 w-2.5" /> {label}
              </Tag>
            ))}
            {task.labels.length > 3 && (
              <Tag tone="neutral" size="sm">
                +{task.labels.length - 3}
              </Tag>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {task.assigneeName ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="bg-gradient-primary text-[9px] font-bold text-white">
                    {initials(task.assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground truncate">{task.assigneeName}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">Без исполнителя</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {task.commentsCount > 0 && (
              <span
                className="text-muted-foreground flex items-center gap-0.5"
                aria-label={`${task.commentsCount} комментариев`}
              >
                <MessageCircle className="h-3 w-3" />
                {task.commentsCount}
              </span>
            )}
            {deadline && (
              <Tag tone={deadline.tone} size="sm">
                {deadline.label}
              </Tag>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")).toUpperCase();
}

interface DeadlineFmt {
  label: string;
  tone: "neutral" | "warning" | "danger";
}

function formatDeadline(iso: string | null): DeadlineFmt | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadline = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDeadline.getTime() - startOfToday.getTime()) / 86400000);

  const fmt = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

  if (diffDays < 0) return { label: `Просрочено ${fmt}`, tone: "danger" };
  if (diffDays === 0) return { label: "Сегодня", tone: "danger" };
  if (diffDays === 1) return { label: "Завтра", tone: "warning" };
  if (diffDays <= 3) return { label: `${fmt} (${diffDays}д)`, tone: "warning" };
  return { label: fmt, tone: "neutral" };
}
