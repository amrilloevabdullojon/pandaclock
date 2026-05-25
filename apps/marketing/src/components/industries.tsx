const INDUSTRIES = [
  {
    emoji: "💻",
    title: "IT и офис",
    description: "Удалёнка, гибкий график, интеграции с Jira и Slack.",
    available: true,
  },
  {
    emoji: "🏨",
    title: "Отели и кафе (HoReCa)",
    description: "Сменное планирование, несколько локаций, терминалы для отметки.",
    available: false,
    badge: "Скоро",
  },
  {
    emoji: "📞",
    title: "Колл-центры",
    description: "Сменный график 24/7, KPI операторов, интеграция с АТС.",
    available: false,
    badge: "Этап 3",
  },
  {
    emoji: "🏦",
    title: "Банки и финансы",
    description: "Compliance, ЭЦП, многоуровневые согласования, ISO 27001.",
    available: false,
    badge: "Этап 4",
  },
];

export function Industries() {
  return (
    <section id="industries" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-extrabold text-neutral-900">
            Подходит для вашей сферы
          </h2>
          <p className="text-lg text-neutral-500">
            Pandaclock работает везде, где есть команда. Для каждой отрасли — свои модули.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry.title}
              className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-5xl">{industry.emoji}</p>
                {industry.badge ? (
                  <span className="rounded-pill bg-warning-light px-3 py-1 text-xs font-semibold text-warning">
                    {industry.badge}
                  </span>
                ) : (
                  <span className="rounded-pill bg-success-light px-3 py-1 text-xs font-semibold text-success">
                    Доступно
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-xl font-bold text-neutral-900">{industry.title}</h3>
              <p className="mt-2 text-neutral-500">{industry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
