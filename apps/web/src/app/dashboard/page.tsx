import { Card, CardContent } from "@pandaclock/ui";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-neutral-900">Добро пожаловать</h1>
        <p className="text-sm text-neutral-500">
          Базовый дашборд. Виджеты подключим в следующих спринтах.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Сотрудников", value: "—" },
          { label: "На работе сейчас", value: "—" },
          { label: "Задач выполнено", value: "—" },
          { label: "Заявок ждёт", value: "—" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {kpi.label}
              </p>
              <p className="mt-2 text-3xl font-extrabold text-neutral-900">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
