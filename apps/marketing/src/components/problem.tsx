const PROBLEMS = [
  {
    emoji: "😩",
    title: "HR-таблицы в Excel",
    description: "Каждый месяц считаете часы и опоздания вручную.",
  },
  {
    emoji: "📊",
    title: "Никто не знает кто чем занят",
    description: "Задачи теряются в Telegram, никто не помнит сроки.",
  },
  {
    emoji: "❓",
    title: "Кто на работе сейчас?",
    description: "Звонить в офис, чтобы узнать, пришёл ли менеджер.",
  },
  {
    emoji: "📞",
    title: "Сотрудник снова опоздал?",
    description: "Доказать сложно — всё держится на памяти охранника.",
  },
];

export function Problem() {
  return (
    <section className="bg-neutral-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-extrabold text-neutral-900">Знакомая ситуация?</h2>
          <p className="text-lg text-neutral-500">
            Если хотя бы один пункт про вас — Pandaclock решит эту проблему.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.title}
              className="rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <p className="text-4xl">{problem.emoji}</p>
              <h3 className="mt-3 text-base font-bold text-neutral-900">{problem.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
