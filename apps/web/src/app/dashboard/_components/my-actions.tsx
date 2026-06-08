import Link from "next/link";
import { ClipboardList, GraduationCap, Wallet, type LucideIcon } from "lucide-react";
import { Card, CardContent, Progress } from "@pandaclock/ui";
import { serverFetch } from "@/lib/server-api";

interface ActiveSurvey {
  id: string;
  title: string;
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  enrolled: boolean;
  progress: number;
  completed: boolean;
}

interface MyPayslip {
  id: string;
  period: string;
  status: string;
}

/**
 * Персональный виджет «Мне сегодня» — собирает action items сотрудника
 * из опросов, обучения и расчётных листков. Скрывается, если делать нечего.
 */
export async function MyActions() {
  const [surveys, courses, payslips] = await Promise.all([
    serverFetch<ActiveSurvey[]>("/surveys/active").catch(() => [] as ActiveSurvey[]),
    serverFetch<Course[]>("/knowledge/courses").catch(() => [] as Course[]),
    serverFetch<MyPayslip[]>("/payroll/payslips/my").catch(() => [] as MyPayslip[]),
  ]);

  const pendingSurveys = surveys.filter((s) => !s.completed);
  const inProgress = courses.filter((c) => c.enrolled && !c.completed).slice(0, 3);
  const latestPayslip = payslips[0] ?? null;

  if (pendingSurveys.length === 0 && inProgress.length === 0 && !latestPayslip) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-foreground mb-4 text-lg font-bold">Мне сегодня</h2>
        <div className="space-y-2">
          {pendingSurveys.length > 0 ? (
            <ActionRow
              icon={ClipboardList}
              href="/dashboard/surveys"
              title={
                pendingSurveys.length === 1
                  ? "Пройти опрос"
                  : `Пройти опросы (${pendingSurveys.length})`
              }
              subtitle={pendingSurveys.map((s) => s.title).join(" · ")}
              tone="info"
            />
          ) : null}

          {inProgress.map((c) => (
            <ActionRow
              key={c.id}
              icon={GraduationCap}
              href="/dashboard/knowledge"
              title={c.title}
              subtitle={`Курс в процессе — ${c.progress}%`}
              tone="primary"
              progress={c.progress}
            />
          ))}

          {latestPayslip ? (
            <ActionRow
              icon={Wallet}
              href="/dashboard/payroll"
              title={`Расчётный листок за ${latestPayslip.period}`}
              subtitle={latestPayslip.status === "PAID" ? "Выплачен" : "Утверждён"}
              tone="success"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const TONE: Record<string, string> = {
  primary: "text-primary-500 bg-primary-50",
  info: "text-info bg-info-light",
  success: "text-success bg-success-light",
};

function ActionRow({
  icon: Icon,
  href,
  title,
  subtitle,
  tone,
  progress,
}: {
  icon: LucideIcon;
  href: string;
  title: string;
  subtitle: string;
  tone: "primary" | "info" | "success";
  progress?: number;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted/40 border-border hover:border-primary flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        {progress !== undefined ? <Progress value={progress} className="mt-1.5 h-1.5" /> : null}
      </div>
    </Link>
  );
}
