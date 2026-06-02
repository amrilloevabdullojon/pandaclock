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
  primaryColor: string | null;
}

const DEFAULT_PRIMARY = "#5B4FE2";
const COLOR_PRESETS = [
  { label: "Pandaclock", hex: "#5B4FE2" },
  { label: "Океан", hex: "#0EA5E9" },
  { label: "Лес", hex: "#10B981" },
  { label: "Закат", hex: "#F97316" },
  { label: "Вишня", hex: "#EF4444" },
  { label: "Графит", hex: "#475569" },
];

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
  const [primaryColor, setPrimaryColor] = React.useState(initial.primaryColor ?? DEFAULT_PRIMARY);
  const [colorEnabled, setColorEnabled] = React.useState(initial.primaryColor !== null);
  const [saving, setSaving] = React.useState(false);

  const effectivePrimary = colorEnabled ? primaryColor : null;
  const initialEffective = initial.primaryColor;
  const dirty =
    name !== initial.name ||
    (industry || null) !== (initial.industry ?? null) ||
    timezone !== initial.timezone ||
    effectivePrimary !== initialEffective;

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
          primaryColor: effectivePrimary,
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

      {/* ===== Брендинг ===== */}
      <div className="border-border space-y-3 border-t pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-foreground text-base font-bold">Брендинг</h3>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Основной цвет применится к кнопкам, ссылкам и активным элементам.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={colorEnabled}
              onChange={(e) => setColorEnabled(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <span className="text-foreground text-sm font-semibold">Свой цвет</span>
          </label>
        </div>

        {colorEnabled ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => {
                const active = preset.hex.toLowerCase() === primaryColor.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    aria-label={preset.label}
                    title={`${preset.label} · ${preset.hex}`}
                    style={{ backgroundColor: preset.hex }}
                    className={`h-8 w-8 rounded-full ring-2 transition-all ${
                      active ? "ring-foreground scale-110" : "ring-transparent"
                    }`}
                  />
                );
              })}
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="border-border h-8 w-12 cursor-pointer rounded border bg-transparent p-0"
                aria-label="Свой цвет"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#RRGGBB"
                maxLength={7}
                className="w-28 font-mono text-xs"
              />
            </div>

            {/* Preview-кнопка */}
            <div className="border-border bg-muted/40 flex items-center justify-between gap-3 rounded-md border p-3">
              <span className="text-muted-foreground text-xs">Предпросмотр:</span>
              <button
                type="button"
                style={{ backgroundColor: primaryColor }}
                className="rounded-md px-4 py-2 text-sm font-bold text-white shadow-sm"
              >
                Кнопка вашего цвета
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              💡 Изменения видны после сохранения и перезагрузки страницы.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Используется стандартная палитра Pandaclock.
          </p>
        )}
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
