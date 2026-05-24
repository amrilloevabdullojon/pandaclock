import Link from "next/link";
import { Button } from "@pandaclock/ui";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-primary-50 to-white px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-pill bg-primary-100 px-4 py-2 text-sm font-semibold text-primary-700">
            🎉 Бесплатно 14 дней, без карты
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-neutral-900 md:text-6xl">
            HR-система, <br />
            которая <span className="text-primary-500">работает за вас</span>.
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-neutral-500">
            Учёт времени, задачи, чаты и отчёты для вашей команды — в одном понятном инструменте.
            Создано в Узбекистане.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="#cta">Начать бесплатно →</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#demo">▶ Посмотреть демо</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            ✓ 14 дней триал  ·  ✓ Без карты  ·  ✓ Поддержка на русском и узбекском
          </p>
        </div>

        <div className="relative">
          <div className="aspect-[4/3] rounded-2xl bg-gradient-primary p-1 shadow-primary">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-white text-center text-neutral-400">
              <div>
                <div className="text-7xl">🐼</div>
                <p className="mt-2 text-sm">Превью дашборда</p>
                <p className="text-xs">(скриншот добавится в Sprint 4)</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-md">
            <p className="text-xs font-semibold text-neutral-500">Сегодня в офисе</p>
            <p className="text-2xl font-extrabold text-neutral-900">89 / 142</p>
            <p className="text-xs text-success">+5 за час</p>
          </div>
        </div>
      </div>
    </section>
  );
}
