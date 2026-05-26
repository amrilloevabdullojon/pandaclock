"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
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

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (e < s) return 0;
  let count = 0;
  for (let cursor = s; cursor <= e; cursor = new Date(cursor.getTime() + 86400000)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function CreateRequestButton({ balance }: { balance: Balance | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("VACATION");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => countWorkingDays(startDate, endDate), [startDate, endDate]);
  const remainingAfter =
    balance && type === "VACATION" ? balance.remaining - days : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate, endDate, reason: reason || undefined }),
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
      setStartDate("");
      setEndDate("");
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
            <label className="text-sm font-semibold text-neutral-700">Тип</label>
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
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">С</label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">По</label>
              <Input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {days > 0 ? (
            <div className="rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-700">
              {days} рабочих дней
              {remainingAfter !== null ? (
                <> · остаток после: <strong>{remainingAfter}</strong></>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Причина</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Опционально"
              className="block w-full rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-ring focus-visible:border-primary-500"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
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
