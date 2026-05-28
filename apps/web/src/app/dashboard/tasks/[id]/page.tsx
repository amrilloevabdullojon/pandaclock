import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardContent } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { TaskActions } from "./_components/task-actions";
import { CommentList } from "./_components/comment-list";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeName: string | null;
  createdByName: string;
  deadline: string | null;
  completedAt: string | null;
  labels: string[];
  createdAt: string;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task, comments] = await Promise.all([
    serverFetch<TaskDetail>(`/tasks/${id}`).catch(() => null),
    serverFetch<Comment[]>(`/tasks/${id}/comments`).catch(() => [] as Comment[]),
  ]);

  if (!task) notFound();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/tasks" className="text-primary-500 text-sm hover:underline">
        ← Назад к доске
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <header>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-pill bg-muted text-muted-foreground px-2 py-0.5 text-xs"
                >
                  #{label}
                </span>
              ))}
            </div>
            <h1 className="text-foreground text-3xl font-extrabold">{task.title}</h1>
          </header>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-muted-foreground mb-2 text-sm font-semibold uppercase tracking-wider">
                Описание
              </h2>
              {task.description ? (
                <p className="text-foreground whitespace-pre-wrap text-sm">{task.description}</p>
              ) : (
                <p className="text-muted-foreground text-sm">Без описания.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wider">
                Комментарии · {comments.length}
              </h2>
              <CommentList taskId={task.id} initial={comments} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <Row label="Исполнитель">{task.assigneeName ?? "—"}</Row>
              <Row label="Создал">{task.createdByName}</Row>
              <Row label="Дедлайн">
                {task.deadline ? new Date(task.deadline).toLocaleString("ru-RU") : "—"}
              </Row>
              <Row label="Создана">{new Date(task.createdAt).toLocaleDateString("ru-RU")}</Row>
              {task.completedAt ? (
                <Row label="Завершена">{new Date(task.completedAt).toLocaleString("ru-RU")}</Row>
              ) : null}
            </CardContent>
          </Card>

          <TaskActions taskId={task.id} currentStatus={task.status} />
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground text-right font-semibold">{children}</dd>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskDetail["priority"] }) {
  if (priority === "URGENT") return <Badge variant="danger">🔥 Срочно</Badge>;
  if (priority === "HIGH") return <Badge variant="warning">Высокий</Badge>;
  if (priority === "MEDIUM") return <Badge variant="secondary">Средний</Badge>;
  return <Badge variant="outline">Низкий</Badge>;
}

function StatusBadge({ status }: { status: TaskDetail["status"] }) {
  const map = {
    NEW: { variant: "default" as const, label: "Новая" },
    IN_PROGRESS: { variant: "warning" as const, label: "В работе" },
    DONE: { variant: "success" as const, label: "Готово" },
    REJECTED: { variant: "danger" as const, label: "Отклонена" },
  };
  return <Badge variant={map[status].variant}>{map[status].label}</Badge>;
}
