import { Button } from "@pandaclock/ui";

export function FinalCta() {
  return (
    <section id="cta" className="px-6 py-20">
      <div className="mx-auto max-w-5xl rounded-2xl bg-gradient-primary p-12 text-center text-white shadow-primary md:p-20">
        <h2 className="mb-4 text-4xl font-extrabold md:text-5xl">Готовы попробовать?</h2>
        <p className="mb-8 text-lg text-white/85">
          Начните бесплатный триал на 14 дней. Без банковской карты, без обязательств.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="secondary" size="lg">
            <a href="/register">Начать бесплатно</a>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-white bg-transparent text-white hover:bg-white/10"
          >
            <a href="mailto:sales@pandaclock.uz">Запросить демо</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
