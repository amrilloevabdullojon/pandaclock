"use client";

import * as React from "react";
import { Crosshair, MapPin, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Label, toast } from "@pandaclock/ui";

export interface Office {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
}

interface Props {
  offices: Office[];
  onChange: (offices: Office[]) => void;
  disabled?: boolean;
}

/**
 * Редактор списка офисов (multi-geofence).
 *
 * Каждый офис — карточка с inline-полями (name, lat, lng, radius). Кнопки:
 *  - «Использовать моё местоположение» — заполняет lat/lng текущего офиса
 *    через navigator.geolocation
 *  - «Открыть на карте» — ссылка на OpenStreetMap (если координаты заданы)
 *  - Trash — удалить офис
 *  - «+ Добавить офис» внизу — generate id через crypto.randomUUID(), пустые
 *    значения
 *
 * Сам не делает API-запрос — отдаёт массив обратно через onChange.
 */
export function OfficesEditor({ offices, onChange, disabled }: Props) {
  const [locatingId, setLocatingId] = React.useState<string | null>(null);

  function updateOffice(id: string, patch: Partial<Office>): void {
    onChange(offices.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function addOffice(): void {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `office-${Date.now()}`;
    onChange([
      ...offices,
      { id, name: `Офис ${offices.length + 1}`, latitude: null, longitude: null, radius: 200 },
    ]);
  }

  function removeOffice(id: string): void {
    onChange(offices.filter((o) => o.id !== id));
  }

  function useMyLocation(id: string): void {
    if (!("geolocation" in navigator)) {
      toast.error("Браузер не поддерживает геолокацию");
      return;
    }
    setLocatingId(id);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateOffice(id, {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocatingId(null);
        toast.success(`Координаты заполнены (±${Math.round(pos.coords.accuracy)} м)`);
      },
      (err) => {
        setLocatingId(null);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Разрешите геолокацию в настройках браузера"
            : "Не удалось определить местоположение",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  if (offices.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-md border border-dashed p-6 text-center">
        <MapPin className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
        <p className="text-foreground text-sm font-semibold">Геофенс не настроен</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Без офисов сотрудники могут отмечаться откуда угодно.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={addOffice}
          disabled={disabled}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Добавить первый офис
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offices.map((office, idx) => {
        const osmLink =
          office.latitude !== null && office.longitude !== null
            ? `https://www.openstreetmap.org/?mlat=${office.latitude}&mlon=${office.longitude}#map=17/${office.latitude}/${office.longitude}`
            : null;
        return (
          <Card key={office.id} className="bg-muted/40 space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                Офис #{idx + 1}
              </p>
              <button
                type="button"
                onClick={() => removeOffice(office.id)}
                disabled={disabled}
                aria-label={`Удалить офис ${office.name || idx + 1}`}
                className="text-muted-foreground hover:text-danger p-1 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`office-name-${office.id}`}>Название</Label>
                <Input
                  id={`office-name-${office.id}`}
                  value={office.name}
                  onChange={(e) => updateOffice(office.id, { name: e.target.value })}
                  placeholder="Главный офис"
                  maxLength={100}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`office-radius-${office.id}`}>Радиус (метров)</Label>
                <Input
                  id={`office-radius-${office.id}`}
                  type="number"
                  min={10}
                  max={50_000}
                  value={office.radius}
                  onChange={(e) =>
                    updateOffice(office.id, { radius: parseInt(e.target.value, 10) || 0 })
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`office-lat-${office.id}`}>Широта</Label>
                <Input
                  id={`office-lat-${office.id}`}
                  type="text"
                  inputMode="decimal"
                  value={office.latitude === null ? "" : String(office.latitude)}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateOffice(office.id, { latitude: v === "" ? null : parseFloat(v) });
                  }}
                  placeholder="41.311081"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`office-lng-${office.id}`}>Долгота</Label>
                <Input
                  id={`office-lng-${office.id}`}
                  type="text"
                  inputMode="decimal"
                  value={office.longitude === null ? "" : String(office.longitude)}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateOffice(office.id, { longitude: v === "" ? null : parseFloat(v) });
                  }}
                  placeholder="69.279729"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => useMyLocation(office.id)}
                loading={locatingId === office.id}
                loadingText="Определяем…"
                leftIcon={<Crosshair className="h-4 w-4" />}
                disabled={disabled}
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
                  Открыть на карте
                </a>
              ) : null}
            </div>
          </Card>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addOffice}
        disabled={disabled}
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Добавить ещё офис
      </Button>
    </div>
  );
}
