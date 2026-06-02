"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Crosshair, MapPin, Save } from "lucide-react";
import { Button, Card, Checkbox, Input, Label, Switch, toast } from "@pandaclock/ui";

export interface TimePolicy {
  workStart: string;
  workEnd: string;
  lateThresholdMinutes: number;
  workdays: number[];
  geofence?: {
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
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
export function CompanyPolicyForm({ initial, canEdit }: Props) {
  const router = useRouter();
  const [workStart, setWorkStart] = React.useState(initial.workStart);
  const [workEnd, setWorkEnd] = React.useState(initial.workEnd);
  const [lateThreshold, setLateThreshold] = React.useState(String(initial.lateThresholdMinutes));
  const [workdays, setWorkdays] = React.useState<Set<number>>(new Set(initial.workdays));
  const [geofenceEnabled, setGeofenceEnabled] = React.useState(!!initial.geofence);
  const [latitude, setLatitude] = React.useState(
    initial.geofence ? String(initial.geofence.latitude) : "",
  );
  const [longitude, setLongitude] = React.useState(
    initial.geofence ? String(initial.geofence.longitude) : "",
  );
  const [radius, setRadius] = React.useState(
    initial.geofence ? String(initial.geofence.radius) : "200",
  );
  const [officeName, setOfficeName] = React.useState(initial.geofence?.name ?? "");
  const [locating, setLocating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function toggleWorkday(iso: number): void {
    setWorkdays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  async function useMyLocation(): Promise<void> {
    if (!("geolocation" in navigator)) {
      toast.error("Браузер не поддерживает геолокацию");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success(`Координаты определены (±${Math.round(pos.coords.accuracy)} м)`);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Разрешите геолокацию в настройках браузера"
            : "Не удалось определить местоположение",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function handleSave(): Promise<void> {
    if (workdays.size === 0) {
      toast.error("Выберите хотя бы один рабочий день");
      return;
    }
    let geofencePayload: TimePolicy["geofence"] | null;
    if (!geofenceEnabled) {
      geofencePayload = null;
    } else {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const rad = parseInt(radius, 10);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        toast.error("Широта должна быть от -90 до 90");
        return;
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        toast.error("Долгота должна быть от -180 до 180");
        return;
      }
      if (!Number.isInteger(rad) || rad < 10 || rad > 50_000) {
        toast.error("Радиус — целое число от 10 до 50 000 метров");
        return;
      }
      geofencePayload = {
        latitude: lat,
        longitude: lng,
        radius: rad,
        ...(officeName.trim() ? { name: officeName.trim() } : {}),
      };
    }

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
          geofence: geofencePayload,
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

  const osmLink =
    geofenceEnabled && latitude && longitude
      ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
      : null;

  const fieldsetDisabled = !canEdit || saving;

  return (
    <fieldset disabled={fieldsetDisabled} className="space-y-8">
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

      {/* ===== Геофенс ===== */}
      <section>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-foreground text-base font-bold">Геофенс офиса</h2>
          <div className="flex items-center gap-2">
            <Switch
              id="geofence-toggle"
              checked={geofenceEnabled}
              onCheckedChange={setGeofenceEnabled}
            />
            <Label htmlFor="geofence-toggle" className="cursor-pointer text-sm">
              {geofenceEnabled ? "Включён" : "Выключен"}
            </Label>
          </div>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          {geofenceEnabled
            ? "Сотрудники должны быть в радиусе X метров от офиса, чтобы отметиться. Если они вне зоны — система спрашивает причину."
            : "Сотрудники могут отмечаться откуда угодно. Геофенс не учитывается."}
        </p>

        {geofenceEnabled ? (
          <Card className="bg-muted/40 space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="office-name">Название офиса (необязательно)</Label>
                <Input
                  id="office-name"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="Например: Tashkent Plaza, 5 этаж"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="radius">Радиус (метров)</Label>
                <Input
                  id="radius"
                  type="number"
                  min={10}
                  max={50_000}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="latitude">Широта</Label>
                <Input
                  id="latitude"
                  type="text"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="41.311081"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude">Долгота</Label>
                <Input
                  id="longitude"
                  type="text"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="69.279729"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useMyLocation}
                loading={locating}
                loadingText="Определяем…"
                leftIcon={<Crosshair className="h-4 w-4" />}
              >
                Использовать моё местоположение
              </Button>
              {osmLink ? (
                <a
                  href={osmLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Открыть на карте (OpenStreetMap)
                </a>
              ) : null}
            </div>

            <p className="text-muted-foreground text-xs">
              💡 Координаты можно скопировать из Google Maps: правый клик на нужной точке → «Что
              здесь?» → числа в карточке снизу. Или нажмите «Использовать моё местоположение»,
              находясь физически в офисе.
            </p>
          </Card>
        ) : null}
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
