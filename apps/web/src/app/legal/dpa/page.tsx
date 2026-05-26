import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Соглашение об обработке данных (DPA) — Pandaclock",
};

export default function DpaPage() {
  return (
    <article className="prose mx-auto max-w-3xl px-6 py-12 text-neutral-700">
      <h1 className="text-3xl font-extrabold text-neutral-900">
        Соглашение об обработке данных (DPA)
      </h1>
      <p className="text-sm text-neutral-500">Версия 1.0 · 26 мая 2026</p>

      <h2 className="mt-8 text-xl font-bold text-neutral-900">Роли сторон</h2>
      <ul>
        <li>
          <strong>Контролёр</strong> — Компания-клиент Pandaclock. Определяет цели и средства
          обработки данных своих сотрудников.
        </li>
        <li>
          <strong>Обработчик</strong> — ООО «Pandaclock». Обрабатывает данные по инструкциям
          Контролёра, отражённым в функциональности сервиса.
        </li>
      </ul>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">Обязательства Обработчика</h2>
      <ul>
        <li>Уведомление о любых инцидентах безопасности в течение 72 часов</li>
        <li>Хранение данных граждан Узбекистана на серверах в РУз</li>
        <li>Удалить или вернуть все данные по требованию Контролёра</li>
        <li>Не привлекать суб-обработчиков без письменного согласия</li>
      </ul>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">Перечень суб-обработчиков</h2>
      <ul>
        <li>Vercel — хостинг web (США/EU)</li>
        <li>Resend — email-доставка (США)</li>
        <li>Expo Push (FCM/APN) — мобильные уведомления</li>
        <li>Click, Payme — платежи (Узбекистан)</li>
        <li>Sentry — мониторинг ошибок</li>
      </ul>

      <p className="mt-8 text-xs text-neutral-500">
        Полный DPA-шаблон — docs/Юридические_шаблоны.md.
      </p>
    </article>
  );
}
