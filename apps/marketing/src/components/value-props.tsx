import { Clock, CheckSquare, BarChart3 } from "lucide-react";

const items = [
  {
    icon: Clock,
    title: "Учёт времени за 1 клик",
    description:
      "Сотрудник отмечает день в мобильном приложении — система автоматически считает часы и опоздания.",
  },
  {
    icon: CheckSquare,
    title: "Задачи и результаты",
    description:
      "Назначайте задачи, обсуждайте в комментариях, контролируйте дедлайны — без потерь в чатах.",
  },
  {
    icon: BarChart3,
    title: "Прозрачные отчёты",
    description: "Часы, KPI, выполнение — экспорт в Excel и PDF без копаний по Telegram и таблицам.",
  },
];

export function ValueProps() {
  return (
    <section id="features" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-extrabold text-neutral-900">
            Pandaclock — это просто и эффективно
          </h2>
          <p className="text-lg text-neutral-500">
            Три продукта в одном инструменте, чтобы заменить Excel и Telegram.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-500">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-neutral-900">{title}</h3>
              <p className="text-neutral-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
