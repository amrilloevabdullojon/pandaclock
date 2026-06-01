"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Circle, Clock, Sparkles, Users, X } from "lucide-react";
import { Card, CardContent, cn, toast } from "@pandaclock/ui";

interface Step {
  key: "departments" | "employees" | "tasks" | "time";
  done: boolean;
}

interface OnboardingResponse {
  steps: Step[];
  completedCount: number;
  totalCount: number;
  dismissedAt: string | null;
}

const STEP_CONFIG: Record<
  Step["key"],
  {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  departments: {
    title: "Добавьте первый отдел",
    description: "Иерархия команды для аналитики и заявок",
    href: "/dashboard/departments",
    icon: Building2,
  },
  employees: {
    title: "Пригласите коллегу",
    description: "Им придёт письмо со ссылкой для входа",
    href: "/dashboard/employees",
    icon: Users,
  },
  tasks: {
    title: "Создайте первую задачу",
    description: "Канбан-доска для постановки и отслеживания",
    href: "/dashboard/tasks",
    icon: CheckCircle2,
  },
  time: {
    title: "Отметьте приход на работу",
    description: "Clock-in с геолокацией — основа учёта",
    href: "/dashboard/time",
    icon: Clock,
  },
};

export function OnboardingChecklist({ initial }: { initial: OnboardingResponse }) {
  const router = useRouter();
  // initial неизменяемый; локально мы не апдейтим состояние шагов — они
  // приходят с сервера при F5. setData убран чтобы не вводить в заблуждение.
  const data = initial;
  const [hidden, setHidden] = React.useState(false);

  // Все шаги пройдены — показываем поздравление 5 сек и скрываем
  React.useEffect(() => {
    if (data.completedCount === data.totalCount && !data.dismissedAt) {
      const timer = setTimeout(() => {
        void dismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [data.completedCount, data.totalCount, data.dismissedAt]);

  if (hidden || data.dismissedAt) return null;

  async function dismiss() {
    setHidden(true);
    try {
      await fetch("/api/onboarding/dismiss", { method: "POST" });
      router.refresh();
    } catch {
      // Тихо игнорируем — UI уже скрыт, при F5 покажется снова
    }
  }

  const allDone = data.completedCount === data.totalCount;

  return (
    <Card className="border-primary-200 from-primary-50/60 dark:from-primary-950/30 dark:border-primary-900 bg-gradient-to-br to-transparent">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-primary-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-bold">
                {allDone ? "Готово! Pandaclock настроен 🎉" : "Настройка Pandaclock"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {allDone
                  ? "Можно работать. Подсказка скоро исчезнет."
                  : `${data.completedCount} из ${data.totalCount} шагов выполнено`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void dismiss();
              toast.success("Подсказки скрыты");
            }}
            className="focus-ring text-muted-foreground hover:text-foreground rounded-sm p-1"
            aria-label="Скрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Прогресс-бар */}
        <div className="bg-primary-100 dark:bg-primary-900 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary-500 ease-out-expo h-full rounded-full transition-all duration-500"
            style={{ width: `${(data.completedCount / data.totalCount) * 100}%` }}
          />
        </div>

        {/* Шаги */}
        <ul className="grid gap-2 md:grid-cols-2">
          {data.steps.map((step) => {
            const cfg = STEP_CONFIG[step.key];
            const Icon = cfg.icon;
            return (
              <li key={step.key}>
                <Link
                  href={cfg.href}
                  className={cn(
                    "focus-ring group flex items-start gap-3 rounded-md border p-3 transition-colors",
                    step.done
                      ? "border-success/30 bg-success-light/50"
                      : "border-border bg-card hover:border-primary-300 hover:bg-primary-50/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      step.done ? "bg-success text-white" : "bg-primary-100 text-primary-700",
                    )}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        step.done ? "text-success line-through opacity-80" : "text-foreground",
                      )}
                    >
                      {cfg.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{cfg.description}</p>
                  </div>
                  {!step.done && (
                    <Circle className="text-muted-foreground mt-1 h-3.5 w-3.5 shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
