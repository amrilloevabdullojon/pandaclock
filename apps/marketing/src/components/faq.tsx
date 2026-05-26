"use client";

import { useState } from "react";

const ITEMS = [
  {
    q: "Безопасно ли хранить данные сотрудников в облаке?",
    a: "Да. Шифрование TLS 1.3 при передаче и AES-256 в хранении, изоляция данных между компаниями (schema-per-tenant), резервные копии каждый день, журнал аудита и 2FA.",
  },
  {
    q: "Где физически хранятся наши данные?",
    a: "Данные граждан Узбекистана — на серверах в Республике Узбекистан (закон №547). Для международных клиентов — в их юрисдикции, либо on-premise (Enterprise).",
  },
  {
    q: "Сколько времени занимает запуск?",
    a: "5 минут до первой работающей версии: регистрация компании, импорт сотрудников из Excel или приглашения по email, скачивание мобильного приложения.",
  },
  {
    q: "Можно ли импортировать сотрудников из Excel?",
    a: "Да. Зайдите в Сотрудники → «+ Добавить» → «Импорт из Excel» — поддерживаются английские и русские заголовки колонок (Email, Имя, Фамилия, Должность).",
  },
  {
    q: "Работает ли приложение без интернета?",
    a: "Да. Mobile-приложение кэширует отметки в офлайн-режиме и синхронизирует их сразу после появления сети.",
  },
  {
    q: "Как происходит оплата?",
    a: "Click, Payme, Uzcard и Humo для Узбекистана; Stripe для международных клиентов; банковский перевод для юр.лиц. Можно сменить тариф или отменить в любой момент.",
  },
  {
    q: "Что если у нас больше 500 сотрудников?",
    a: "Тариф Enterprise: без ограничений, личный менеджер, SLA 99.9%, кастомные интеграции (1С, HRIS, АТС), опция on-premise.",
  },
  {
    q: "Можно ли отменить подписку?",
    a: "Да, без штрафов. Триал отменяется в один клик. Платная подписка работает до конца оплаченного периода, возврат возможен в течение 14 дней.",
  },
  {
    q: "Поддерживает ли Pandaclock сменный график?",
    a: "Базовый сменный график — в тарифе Pro. Расширенный модуль для HoReCa и колл-центров появится в следующих релизах.",
  },
  {
    q: "Почему панда?",
    a: "Спокойная, надёжная, знает толк во времени (8–12 часов сна) и любит порядок. Pandi — наш маскот, который встречает вас на каждом экране.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-4xl font-extrabold text-neutral-900">
            Часто задаваемые вопросы
          </h2>
        </div>

        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-neutral-900">{item.q}</span>
                  <span className="text-2xl text-primary-500" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <p className="px-6 pb-5 text-sm text-neutral-600">{item.a}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
