import Image from "next/image";
import Link from "next/link";
import { Button } from "@pandaclock/ui";
import { APP_REGISTER_URL } from "@/lib/app-urls";

export function Hero() {
  return (
    <section className="via-primary-50 relative overflow-hidden bg-gradient-to-b from-white to-white px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div>
          <div className="rounded-pill bg-primary-100 text-primary-700 mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
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
              <a href={APP_REGISTER_URL}>Начать бесплатно →</a>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#pricing">Посмотреть тарифы</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            ✓ 14 дней триал · ✓ Без карты · ✓ Поддержка на русском и узбекском
          </p>
        </div>

        <div className="relative">
          <div className="bg-gradient-primary shadow-primary aspect-[4/3] rounded-2xl p-1">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-white">
              <Image
                src="/mascot/pandi-hello.svg"
                alt="Pandi, маскот Pandaclock, машет лапой"
                width={280}
                height={280}
                priority
              />
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-md">
            <p className="text-xs font-semibold text-neutral-500">Сегодня в офисе</p>
            <p className="text-2xl font-extrabold text-neutral-900">89 / 142</p>
            <p className="text-success text-xs">+5 за час</p>
          </div>
        </div>
      </div>
    </section>
  );
}
