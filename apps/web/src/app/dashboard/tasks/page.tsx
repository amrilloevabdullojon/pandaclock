import { CheckSquare } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
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

  const total =
    board.NEW.length + board.IN_PROGRESS.length + board.DONE.length + board.REJECTED.length;

  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<CheckSquare className="h-6 w-6" />}
        title="Задачи"
        description={`Канбан-доска команды · всего ${total} ${
          total === 1 ? "задача" : total < 5 ? "задачи" : "задач"
        }`}
        actions={<CreateTaskButton employees={employees} />}
      />

      <TasksBoard initialBoard={board} />
    </>
  );
}
