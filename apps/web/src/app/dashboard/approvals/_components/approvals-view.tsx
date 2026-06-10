"use client";

import * as React from "react";
import { Check, ClipboardCheck, Plane, Receipt, X } from "lucide-react";
import { Badge, Button, toast } from "@pandaclock/ui";

interface Trip {
  id: string;
  userName: string;
  destination: string;
  startDate: string;
  endDate: string;
  expenseTotal: number;
}

interface Expense {
  id: string;
  userName: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  spentAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: "Билеты",
  LODGING: "Проживание",
  MEALS: "Питание",
  TRANSPORT: "Транспорт",
  OTHER: "Прочее",
};

function money(amount: number, currency = "UZS"): string {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${currency}`;
}

export function ApprovalsView() {
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selTrips, setSelTrips] = React.useState<Set<string>>(new Set());
  const [selExp, setSelExp] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/travel/approvals");
      if (res.ok) {
        const data = (await res.json()) as { trips: Trip[]; expenses: Expense[] };
        setTrips(data.trips);
        setExpenses(data.expenses);
      } else {
        setTrips([]);
        setExpenses([]);
      }
    } catch {
      setTrips([]);
      setExpenses([]);
    } finally {
      setSelTrips(new Set());
      setSelExp(new Set());
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalSel = selTrips.size + selExp.size;

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (totalSel === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/travel/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripIds: Array.from(selTrips),
          expenseIds: Array.from(selExp),
          decision,
        }),
      });
      if (res.ok) {
        const r = (await res.json()) as { trips: number; expenses: number };
        toast.success(
          `${decision === "APPROVED" ? "Одобрено" : "Отклонено"}: ${r.trips + r.expenses}`,
        );
        await load();
      } else {
        toast.error("Не удалось применить решение");
      }
    } catch {
      toast.error("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;

  if (trips.length === 0 && expenses.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Всё согласовано — ожидающих заявок нет.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {totalSel > 0 ? (
        <div className="border-border bg-card sticky top-2 z-10 flex items-center gap-2 rounded-lg border p-2 shadow-sm">
          <span className="text-foreground text-sm font-medium">Выбрано: {totalSel}</span>
          <Button
            size="sm"
            variant="success"
            className="ml-auto"
            onClick={() => decide("APPROVED")}
            loading={busy}
          >
            <Check className="h-4 w-4" />
            Одобрить
          </Button>
          <Button size="sm" variant="danger" onClick={() => decide("REJECTED")} loading={busy}>
            <X className="h-4 w-4" />
            Отклонить
          </Button>
        </div>
      ) : null}

      {trips.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Plane className="text-muted-foreground h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold">Командировки ({trips.length})</h2>
            <button
              type="button"
              className="text-primary-500 ml-auto text-xs"
              onClick={() =>
                setSelTrips((s) =>
                  s.size === trips.length ? new Set() : new Set(trips.map((t) => t.id)),
                )
              }
            >
              {selTrips.size === trips.length ? "Снять всё" : "Выбрать всё"}
            </button>
          </div>
          <div className="border-border divide-border bg-card divide-y rounded-lg border">
            {trips.map((t) => (
              <label
                key={t.id}
                className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 p-3"
              >
                <input
                  type="checkbox"
                  checked={selTrips.has(t.id)}
                  onChange={() => toggle(selTrips, setSelTrips, t.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">{t.destination}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.userName} · {t.startDate} — {t.endDate}
                    {t.expenseTotal > 0 ? ` · расходы ${money(t.expenseTotal)}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {expenses.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Receipt className="text-muted-foreground h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold">Расходы ({expenses.length})</h2>
            <button
              type="button"
              className="text-primary-500 ml-auto text-xs"
              onClick={() =>
                setSelExp((s) =>
                  s.size === expenses.length ? new Set() : new Set(expenses.map((e) => e.id)),
                )
              }
            >
              {selExp.size === expenses.length ? "Снять всё" : "Выбрать всё"}
            </button>
          </div>
          <div className="border-border divide-border bg-card divide-y rounded-lg border">
            {expenses.map((e) => (
              <label
                key={e.id}
                className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 p-3"
              >
                <input
                  type="checkbox"
                  checked={selExp.has(e.id)}
                  onChange={() => toggle(selExp, setSelExp, e.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium">
                      {money(e.amount, e.currency)}
                    </span>
                    <Badge variant="outline">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {e.userName} · {e.spentAt}
                    {e.description ? ` · ${e.description}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
