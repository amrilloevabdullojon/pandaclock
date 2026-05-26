import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Публичная оферта — Pandaclock",
  description: "Условия использования сервиса Pandaclock",
};

export default function OfertaPage() {
  return (
    <article className="prose mx-auto max-w-3xl px-6 py-12 text-neutral-700">
      <h1 className="text-3xl font-extrabold text-neutral-900">Публичная оферта</h1>
      <p className="text-sm text-neutral-500">Последнее обновление: 26 мая 2026 года</p>
      <p>
        Настоящий документ является официальным предложением (публичной офертой) ООО «Pandaclock»
        (далее — «Исполнитель») в адрес любого юридического лица или индивидуального
        предпринимателя (далее — «Заказчик») заключить договор об оказании услуг доступа к
        программному обеспечению «Pandaclock».
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-900">1. Термины</h2>
      <p>
        <strong>Сервис «Pandaclock»</strong> — программное обеспечение и связанная инфраструктура,
        размещённые на pandaclock.uz, предоставляемые по модели SaaS.
      </p>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">2. Предмет оферты</h2>
      <p>
        Исполнитель предоставляет Заказчику неисключительное право использования Сервиса в
        соответствии с выбранным Тарифным планом.
      </p>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">3. Акцепт</h2>
      <p>
        Полным и безоговорочным акцептом признаётся регистрация Учётной записи на сайте,
        оплата Услуг или фактическое использование Сервиса.
      </p>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">4. Тарифы</h2>
      <p>
        Стоимость Услуг определяется выбранным Тарифным планом и количеством активных
        Пользователей. Способы оплаты: Click, Payme, банковские карты Uzcard/Humo, банковский
        перевод.
      </p>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">5. Локализация данных</h2>
      <p>
        Все данные граждан Республики Узбекистан хранятся на серверах, расположенных в
        Узбекистане, в соответствии с законом №547 от 02.07.2019.
      </p>

      <p className="mt-8 text-xs text-neutral-500">
        Полная версия оферты — см. docs/Юридические_шаблоны.md (требует юридической проверки в
        Ташкенте перед публикацией production-версии).
      </p>
    </article>
  );
}
