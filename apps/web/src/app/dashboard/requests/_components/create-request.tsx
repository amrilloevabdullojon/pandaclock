"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DateRange,
} from "@pandaclock/ui";

type LeaveType = "VACATION" | "SICK" | "TIME_OFF" | "OTHER";

const TYPES: { value: LeaveType; label: string }[] = [
  { value: "VACATION", label: "✈️ Отпуск" },
  { value: "SICK", label: "🤒 Больничный" },
  { value: "TIME_OFF", label: "🎂 Отгул" },
  { value: "OTHER", label: "📝 Другое" },
];

interface Balance {
  used: number;
  accrued: number;
  pending: number;
  remaining: number;
}

function countWorkingDays(range: DateRange | undefined): number {
  if (!range?.from || !range?.to) return 0;
  const s = new Date(
    Date.UTC(range.from.getFullYear(), range.from.getMonth(), range.from.getDate()),
  );
  const e = new Date(Date.UTC(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()));
  if (e < s) return 0;
  let count = 0;
  for (let cursor = s; cursor <= e; cursor = new Date(cursor.getTime() + 86400000)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** YYYY-MM-DD без UTC-сдвига (LocalDate, как ждёт API). */
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CreateRequestButton({ balance }: { balance: Balance | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("VACATION");
  const [range, setRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => countWorkingDays(range), [range]);
  const remainingAfter = balance && type === "VACATION" ? balance.remaining - days : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!range?.from || !range?.to) {
      setError("Выберите даты");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate: toIsoDate(range.from),
          endDate: toIsoDate(range.to),
          reason: reason || undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { code?: string };
        };
        if (body.error?.code === "OVERLAPPING_REQUEST") {
          setError("В этом диапазоне уже есть заявка");
        } else if (body.error?.code === "ZERO_WORKING_DAYS") {
          setError("В диапазоне нет рабочих дней");
        } else {
          setError("Не удалось отправить заявку");
        }
        return;
      }
      setOpen(false);
      setType("VACATION");
      setRange(undefined);
      setReason("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Новая заявка</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая заявка</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-foreground text-sm font-semibold">Тип</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                    type === option.value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-foreground text-sm font-semibold">Период</label>
            <DateRangePicker
              value={range}
              onChange={setRange}
              fromDate={new Date()}
              placeholder="Выберите дни отпуска"
            />
            <p className="text-muted-foreground text-xs">
              Кликните по дате начала, потом по дате окончания.
            </p>
          </div>

          {days > 0 ? (
            <div className="bg-primary-50 text-primary-700 rounded-md px-3 py-2 text-sm">
              {days} рабочих дней
              {remainingAfter !== null ? (
                <>
                  {" "}
                  · остаток после: <strong>{remainingAfter}</strong>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-foreground text-sm font-semibold">Причина</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Опционально"
              className="border-border bg-card focus-ring focus-visible:border-primary-500 block w-full rounded-md border px-4 py-2 text-sm"
            />
          </div>

          {error ? (
            <p className="bg-danger-light text-danger rounded-md px-3 py-2 text-sm">{error}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending || days === 0}>
              {pending ? "..." : "Отправить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
