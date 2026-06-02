"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building, Globe, Save } from "lucide-react";
import { Button, Input, Label, toast } from "@pandaclock/ui";

export interface TenantProfile {
  name: string;
  industry: string | null;
  timezone: string;
  logoUrl: string | null;
}

interface Props {
  initial: TenantProfile;
  canEdit: boolean;
}

const TIMEZONES = [
  { value: "Asia/Tashkent", label: "Asia/Tashkent (UTC+5)" },
  { value: "Asia/Samarkand", label: "Asia/Samarkand (UTC+5)" },
  { value: "Asia/Almaty", label: "Asia/Almaty (UTC+5)" },
  { value: "Asia/Bishkek", label: "Asia/Bishkek (UTC+6)" },
  { value: "Asia/Dushanbe", label: "Asia/Dushanbe (UTC+5)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+3)" },
  { value: "Europe/Kyiv", label: "Europe/Kyiv (UTC+2/3)" },
  { value: "UTC", label: "UTC" },
];

const INDUSTRIES = [
  "IT",
  "Финансы",
  "Розничная торговля",
  "Образование",
  "Здравоохранение",
  "Производство",
  "Логистика",
  "Государственный сектор",
  "Другое",
];

/**
 * Профиль компании: название, индустрия, часовой пояс.
 * Логотип в MVP не загружается — это отдельная задача (S3 + ресайз).
 */
export function CompanyProfileForm({ initial, canEdit }: Props) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [industry, setIndustry] = React.useState(initial.industry ?? "");
  const [timezone, setTimezone] = React.useState(initial.timezone);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    name !== initial.name ||
    (industry || null) !== (initial.industry ?? null) ||
    timezone !== initial.timezone;

  async function handleSave(): Promise<void> {
    if (name.trim().length < 2) {
      toast.error("Название минимум 2 символа");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim() || null,
          timezone,
        }),
      });
      if (response.status === 204) {
        toast.success("Профиль сохранён");
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
      };
      toast.error(
        body.code === "INVALID_TIMEZONE"
          ? "Неверный часовой пояс"
          : (body.message ?? "Не удалось сохранить"),
      );
    } catch {
      toast.error("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset disabled={!canEdit || saving} className="space-y-6">
      <header>
        <h2 className="text-foreground text-base font-bold">Профиль компании</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Эти данные видны в письмах, на счетах и в шапке web-приложения.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company-name">Название</Label>
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ООО «Технополис»"
            maxLength={255}
            prefix={<Building className="h-4 w-4" />}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry">Индустрия</Label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="">— не указана —</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="timezone">Часовой пояс</Label>
          <div className="relative">
            <Globe className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="border-border bg-card focus-ring focus-visible:border-primary-500 flex h-10 w-full rounded-md border pl-10 pr-3 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-muted-foreground text-xs">
            От него зависит, как считаются опоздания и в каком поясе отображается время.
          </p>
        </div>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            loading={saving}
            loadingText="Сохраняем…"
            disabled={!dirty}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Сохранить профиль
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
