import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика обработки персональных данных — Pandaclock",
};

export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-3xl px-6 py-12 text-neutral-700">
      <h1 className="text-3xl font-extrabold text-neutral-900">Политика обработки персональных данных</h1>
      <p className="text-sm text-neutral-500">Дата вступления в силу: 26 мая 2026 года</p>

      <h2 className="mt-8 text-xl font-bold text-neutral-900">Основания</h2>
      <ul>
        <li>Закон Республики Узбекистан №547 «О персональных данных»</li>
        <li>152-ФЗ (для клиентов из РФ)</li>
        <li>GDPR (при международном расширении)</li>
      </ul>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">Какие данные мы собираем</h2>
      <p>ФИО, email, телефон, должность, отметки времени, геолокация (если включено компанией).</p>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">Меры защиты</h2>
      <ul>
        <li>TLS 1.3 при передаче</li>
        <li>AES-256 в хранилище</li>
        <li>Schema-per-tenant изоляция</li>
        <li>Двухфакторная аутентификация для администраторов</li>
        <li>Журнал аудита всех действий</li>
      </ul>

      <h2 className="mt-6 text-xl font-bold text-neutral-900">Ваши права</h2>
      <p>
        Запросить копию данных, удаление, обжаловать обработку в Узкомназорат
        (<a className="text-primary-500" href="https://www.aci.uz">aci.uz</a>) или суде.
      </p>

      <p className="mt-8 text-xs text-neutral-500">
        Полная версия — docs/Юридические_шаблоны.md (требует юридической проверки).
      </p>
    </article>
  );
}
