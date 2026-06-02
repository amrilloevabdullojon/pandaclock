"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button, Checkbox, Input, Label, toast } from "@pandaclock/ui";
import { OfficesEditor, type Office as DraftOffice } from "./offices-editor";

export interface TimePolicy {
  workStart: string;
  workEnd: string;
  lateThresholdMinutes: number;
  workdays: number[];
  /** DEPRECATED — приходит с сервера если legacy, не используем в редакторе. */
  geofence?: {
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
  };
  offices: { id: string; name: string; latitude: number; longitude: number; radius: number }[];
  leave: {
    vacationDaysPerYear: number;
    sickDaysPerYearWithoutDoc: number;
    unpaidDaysPerYear: number;
  };
}

interface Props {
  initial: TimePolicy;
  canEdit: boolean;
}

const WEEKDAYS = [
  { iso: 1, label: "Пн" },
  { iso: 2, label: "Вт" },
  { iso: 3, label: "Ср" },
  { iso: 4, label: "Чт" },
  { iso: 5, label: "Пт" },
  { iso: 6, label: "Сб" },
  { iso: 7, label: "Вс" },
];

/**
 * Форма управления tenant.time_policy.
 *
 * Разделы:
 *  1. Расписание — workStart, workEnd, lateThreshold
 *  2. Рабочие дни — мульти-чекбоксы по ISO weekdays
 *  3. Геофенс — toggle включения + поля координат + кнопка «Использовать
 *     моё местоположение» (browser geolocation) + предпросмотр карты-ссылки
 *     на OpenStreetMap (без необходимости maps API key)
 *
 * canEdit = false → форма readonly + serializer не показывает кнопку Save.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function CompanyPolicyForm({ initial, canEdit }: Props) {
  const router = useRouter();
  const [workStart, setWorkStart] = React.useState(initial.workStart);
  const [workEnd, setWorkEnd] = React.useState(initial.workEnd);
  const [lateThreshold, setLateThreshold] = React.useState(String(initial.lateThresholdMinutes));
  const [workdays, setWorkdays] = React.useState<Set<number>>(new Set(initial.workdays));
  const [offices, setOffices] = React.useState<DraftOffice[]>(
    initial.offices.map((o) => ({
      id: o.id,
      name: o.name,
      latitude: o.latitude,
      longitude: o.longitude,
      radius: o.radius,
    })),
  );
  const [vacationDays, setVacationDays] = React.useState(String(initial.leave.vacationDaysPerYear));
  const [sickDays, setSickDays] = React.useState(String(initial.leave.sickDaysPerYearWithoutDoc));
  const [unpaidDays, setUnpaidDays] = React.useState(String(initial.leave.unpaidDaysPerYear));
  const [saving, setSaving] = React.useState(false);

  function toggleWorkday(iso: number): void {
    setWorkdays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  async function handleSave(): Promise<void> {
    if (workdays.size === 0) {
      toast.error("Выберите хотя бы один рабочий день");
      return;
    }

    // Валидация всех офисов.
    const officesPayload: TimePolicy["offices"] = [];
    for (const [idx, o] of offices.entries()) {
      if (!o.name.trim()) {
        toast.error(`Офис #${idx + 1}: введите название`);
        return;
      }
      if (
        o.latitude === null ||
        !Number.isFinite(o.latitude) ||
        o.latitude < -90 ||
        o.latitude > 90
      ) {
        toast.error(`Офис «${o.name}»: широта от -90 до 90`);
        return;
      }
      if (
        o.longitude === null ||
        !Number.isFinite(o.longitude) ||
        o.longitude < -180 ||
        o.longitude > 180
      ) {
        toast.error(`Офис «${o.name}»: долгота от -180 до 180`);
        return;
      }
      if (!Number.isInteger(o.radius) || o.radius < 10 || o.radius > 50_000) {
        toast.error(`Офис «${o.name}»: радиус 10–50 000 м`);
        return;
      }
      officesPayload.push({
        id: o.id,
        name: o.name.trim(),
        latitude: o.latitude,
        longitude: o.longitude,
        radius: o.radius,
      });
    }

    const leavePayload = {
      vacationDaysPerYear: clamp(parseInt(vacationDays, 10) || 0, 0, 60),
      sickDaysPerYearWithoutDoc: clamp(parseInt(sickDays, 10) || 0, 0, 30),
      unpaidDaysPerYear: clamp(parseInt(unpaidDays, 10) || 0, 0, 60),
    };

    setSaving(true);
    try {
      const response = await fetch("/api/tenant/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workStart,
          workEnd,
          lateThresholdMinutes: Number(lateThreshold) || 0,
          workdays: [...workdays].sort(),
          offices: officesPayload,
          leave: leavePayload,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        toast.error(body.message ?? "Не удалось сохранить");
        return;
      }
      toast.success("Настройки сохранены");
      router.refresh();
    } catch {
      toast.error("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  const fieldsetDisabled = !canEdit || saving;

  return (
    <fieldset disabled={fieldsetDisabled} className="space-y-8">
      <header>
        <h2 className="text-foreground text-base font-bold">Учёт времени и отпуска</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Определяют, когда отметка считается опозданием, и сколько отпускных дней накапливается
          каждый месяц.
        </p>
      </header>
      {/* ===== Расписание ===== */}
      <section>
        <h2 className="text-foreground mb-1 text-base font-bold">Расписание</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Когда начинается и заканчивается стандартный рабочий день. Сотрудники могут отметиться
          раньше или позже, но «опоздание» считается от этих значений.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="work-start">Начало</Label>
            <Input
              id="work-start"
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-end">Конец</Label>
            <Input
              id="work-end"
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="late-threshold">Допуск на опоздание (минут)</Label>
            <Input
              id="late-threshold"
              type="number"
              min={0}
              max={120}
              value={lateThreshold}
              onChange={(e) => setLateThreshold(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ===== Рабочие дни ===== */}
      <section>
        <h2 className="text-foreground mb-1 text-base font-bold">Рабочие дни</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          В выбранные дни сотрудники должны отмечаться. В остальные — система не считает отсутствие
          нарушением.
        </p>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => {
            const checked = workdays.has(day.iso);
            return (
              <label
                key={day.iso}
                className={`hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                  checked ? "border-primary-500 bg-primary-50" : "border-border"
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleWorkday(day.iso)} />
                <span className="text-foreground text-sm font-semibold">{day.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ===== Офисы (геофенс) ===== */}
      <section>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-foreground text-base font-bold">Офисы · {offices.length}</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Чтобы отметиться, сотрудник должен находиться в радиусе любого из офисов. Можно добавить
          филиал в другом городе или несколько зданий в одном.
          {offices.length === 0
            ? " Сейчас геофенс не настроен — отмечаться можно откуда угодно."
            : null}
        </p>
        <OfficesEditor offices={offices} onChange={setOffices} disabled={fieldsetDisabled} />
        <p className="text-muted-foreground mt-3 text-xs">
          💡 Координаты можно скопировать из Google Maps: правый клик → «Что здесь?» → числа в
          карточке снизу. Или нажмите «Использовать моё местоположение», находясь в офисе.
        </p>
      </section>

      {/* ===== Отпуска ===== */}
      <section>
        <h3 className="text-foreground mb-1 text-base font-bold">Лимиты отпусков</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Стандарт РУз — 21 день в год. Сотрудник, проработавший полгода, видит ≈10 дней доступного
          отпуска в балансе.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="vacation-days">Отпуск (дней/год)</Label>
            <Input
              id="vacation-days"
              type="number"
              min={0}
              max={60}
              value={vacationDays}
              onChange={(e) => setVacationDays(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sick-days">Больничный без справки (дней/год)</Label>
            <Input
              id="sick-days"
              type="number"
              min={0}
              max={30}
              value={sickDays}
              onChange={(e) => setSickDays(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Сверх этого — нужна справка от врача.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unpaid-days">Отгулы (дней/год)</Label>
            <Input
              id="unpaid-days"
              type="number"
              min={0}
              max={60}
              value={unpaidDays}
              onChange={(e) => setUnpaidDays(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">0 = отгулы запрещены.</p>
          </div>
        </div>
      </section>

      {/* ===== Save ===== */}
      {canEdit ? (
        <div className="border-border flex justify-end border-t pt-6">
          <Button
            type="button"
            onClick={handleSave}
            loading={saving}
            loadingText="Сохраняем…"
            leftIcon={<Save className="h-4 w-4" />}
          >
            Сохранить настройки
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground border-border border-t pt-6 text-sm">
          У вас нет прав на изменение этих настроек. Обратитесь к OWNER, ADMIN или HR компании.
        </p>
      )}
    </fieldset>
  );
}
