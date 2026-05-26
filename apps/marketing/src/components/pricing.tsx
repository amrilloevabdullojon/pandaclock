"use client";

import { useState } from "react";
import { Button } from "@pandaclock/ui";

interface Plan {
  id: string;
  name: string;
  badge?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  limit: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: "Бесплатно",
    yearlyPrice: "Бесплатно",
    limit: "до 10 сотрудников",
    features: ["Базовый учёт времени", "Задачи", "Чат отдела", "Мобильное приложение"],
    cta: { label: "Начать", href: "/register" },
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: "50,000 UZS + 5,000/сотр",
    yearlyPrice: "40,000 UZS + 4,000/сотр",
    limit: "11–100 сотрудников",
    features: [
      "Всё из Starter",
      "Документы сотрудников",
      "Заявки и согласование",
      "Отчёты PDF / Excel",
      "Все роли",
    ],
    cta: { label: "Триал 14 дней", href: "/register" },
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Рекомендуем",
    monthlyPrice: "30,000 UZS / сотрудник",
    yearlyPrice: "24,000 UZS / сотрудник",
    limit: "100–500 сотрудников",
    features: [
      "Всё из Business",
      "KPI и аналитика",
      "Видеосвязь",
      "Интеграции Google / Microsoft",
      "Двухфакторная аутентификация",
    ],
    cta: { label: "Триал 14 дней", href: "/register" },
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: "Договорная",
    yearlyPrice: "Договорная",
    limit: "500+ сотрудников",
    features: [
      "Всё из Pro",
      "Отраслевой модуль",
      "SLA 99.9% + компенсации",
      "Личный менеджер",
      "On-premise по запросу",
    ],
    cta: { label: "Связаться", href: "mailto:sales@pandaclock.uz" },
  },
];

export function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="pricing" className="bg-neutral-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-4xl font-extrabold text-neutral-900">
            Простые и понятные тарифы
          </h2>
          <p className="text-lg text-neutral-500">
            Платите только за активных сотрудников. Меняйте тариф в любой момент.
          </p>
        </div>

        <div className="mb-10 flex items-center justify-center">
          <div className="inline-flex rounded-pill bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={[
                "rounded-pill px-5 py-2 text-sm font-semibold transition-colors",
                billing === "monthly" ? "bg-primary-500 text-white" : "text-neutral-600",
              ].join(" ")}
            >
              Ежемесячно
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={[
                "rounded-pill px-5 py-2 text-sm font-semibold transition-colors",
                billing === "yearly" ? "bg-primary-500 text-white" : "text-neutral-600",
              ].join(" ")}
            >
              Ежегодно <span className="ml-1 text-xs">−20%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={[
                "rounded-xl border p-6 shadow-sm transition-shadow",
                plan.highlight
                  ? "border-transparent bg-gradient-primary text-white shadow-primary"
                  : "border-neutral-200 bg-white",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between">
                <h3
                  className={
                    plan.highlight
                      ? "text-xl font-extrabold text-white"
                      : "text-xl font-extrabold text-neutral-900"
                  }
                >
                  {plan.name}
                </h3>
                {plan.badge ? (
                  <span className="rounded-pill bg-white/20 px-2 py-0.5 text-xs font-semibold">
                    ⭐ {plan.badge}
                  </span>
                ) : null}
              </div>

              <p
                className={[
                  "mt-3 text-sm font-semibold",
                  plan.highlight ? "text-white" : "text-neutral-900",
                ].join(" ")}
              >
                {billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
              </p>
              <p
                className={[
                  "mt-1 text-xs",
                  plan.highlight ? "text-white/80" : "text-neutral-500",
                ].join(" ")}
              >
                {plan.limit}
              </p>

              <ul
                className={[
                  "mt-4 space-y-2 text-sm",
                  plan.highlight ? "text-white/90" : "text-neutral-600",
                ].join(" ")}
              >
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Button
                  asChild
                  fullWidth
                  variant={plan.highlight ? "secondary" : "primary"}
                >
                  <a href={plan.cta.href}>{plan.cta.label}</a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
