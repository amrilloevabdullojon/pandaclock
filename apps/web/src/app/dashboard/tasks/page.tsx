import { serverFetch } from "@/lib/server-api";
import { TasksBoard } from "./_components/board";
import { CreateTaskButton } from "./_components/create-task";

interface TaskCard {
  id: string;
  title: string;
  status: "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeName: string | null;
  deadline: string | null;
  commentsCount: number;
  labels: string[];
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

export default async function TasksPage() {
  const [board, employees] = await Promise.all([
    serverFetch<Record<TaskCard["status"], TaskCard[]>>("/tasks/board").catch(() => ({
      NEW: [],
      IN_PROGRESS: [],
      DONE: [],
      REJECTED: [],
    })),
    serverFetch<{ items: EmployeeOption[] }>("/employees?pageSize=100")
      .then((r) => r.items)
      .catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">Задачи</h1>
          <p className="text-sm text-neutral-500">Канбан-доска команды</p>
        </div>
        <CreateTaskButton employees={employees} />
      </header>

      <TasksBoard initialBoard={board} />
    </div>
  );
}
