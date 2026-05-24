"use client";

import { useState } from "react";
import { Button, Input } from "@pandaclock/ui";

export interface CompanyData {
  companyName: string;
  slug: string;
  industry: string;
}

const INDUSTRIES = [
  { value: "IT", label: "IT / Технологии" },
  { value: "FINANCE", label: "Финансы / Банки" },
  { value: "HORECA", label: "HoReCa (рестораны, отели)" },
  { value: "CALL_CENTER", label: "Колл-центры" },
  { value: "OTHER", label: "Другое" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export function CompanyStep({
  initial,
  onSubmit,
}: {
  initial: CompanyData | null;
  onSubmit: (data: CompanyData) => void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "IT");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  function handleNameChange(value: string) {
    setCompanyName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || slug.length < 3) return;
    onSubmit({ companyName, slug, industry });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-neutral-900">О компании</h1>
        <p className="mt-1 text-sm text-neutral-500">Расскажите, какую компанию мы регистрируем.</p>
      </header>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700">Название компании</label>
        <Input
          required
          value={companyName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder='ООО "Demo"'
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700">Поддомен</label>
        <div className="flex items-center gap-2">
          <Input
            required
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acmebank"
            pattern="[a-z][a-z0-9-]{2,30}"
            className="flex-1"
          />
          <span className="text-sm text-neutral-500">.pandaclock.uz</span>
        </div>
        <p className="text-xs text-neutral-400">3-31 латинских букв/цифр/дефисов. Начинается с буквы.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700">Сфера деятельности</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="flex h-11 w-full rounded-md border border-neutral-200 bg-white px-4 text-sm focus-ring focus-visible:border-primary-500"
        >
          {INDUSTRIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg">
          Продолжить →
        </Button>
      </div>
    </form>
  );
}
