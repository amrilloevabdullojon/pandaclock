"use client";

import * as React from "react";
import { Check, ChevronLeft, Plane, Plus, Receipt, Send, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@pandaclock/ui";
import { usePermission } from "@/lib/session-context";

type Scope = "my" | "team" | "all";

interface Expense {
  id: string;
  userId: string;
  userName: string;
  tripId: string | null;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  spentAt: string;
  receiptUrl: string | null;
  status: string;
  approverName: string | null;
  approverComment: string | null;
  createdAt: string;
}

interface Trip {
  id: string;
  userId: string;
  userName: string;
  destination: string;
  purpose: string | null;
  startDate: string;
  endDate: string;
  status: string;
  approverName: string | null;
  approverComment: string | null;
  expenseCount: number;
  expenseTotal: number;
  createdAt: string;
}

interface TripDetail extends Trip {
  expenses: Expense[];
}

const CATEGORIES = ["TRAVEL", "LODGING", "MEALS", "TRANSPORT", "OTHER"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: "Билеты",
  LODGING: "Проживание",
  MEALS: "Питание",
  TRANSPORT: "Транспорт",
  OTHER: "Прочее",
};

const TRIP_STATUS: Record<
  string,
  { label: string; variant: "secondary" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Черновик", variant: "secondary" },
  SUBMITTED: { label: "На одобрении", variant: "warning" },
  APPROVED: { label: "Одобрена", variant: "success" },
  REJECTED: { label: "Отклонена", variant: "danger" },
};

const EXPENSE_STATUS: Record<string, { label: string; variant: "warning" | "success" | "danger" }> =
  {
    PENDING: { label: "Ожидает", variant: "warning" },
    APPROVED: { label: "Одобрен", variant: "success" },
    REJECTED: { label: "Отклонён", variant: "danger" },
  };

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${currency}`;
}

export function TravelView() {
  const canApprove = usePermission("travel:approve");
  const [scope, setScope] = React.useState<Scope>("my");

  return (
    <Tabs defaultValue="trips" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="trips">Командировки</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
        </TabsList>
        {canApprove ? <ScopeSelector scope={scope} onChange={setScope} /> : null}
      </div>
      <TabsContent value="trips">
        <TripsTab scope={scope} canApprove={canApprove} />
      </TabsContent>
      <TabsContent value="expenses">
        <ExpensesTab scope={scope} canApprove={canApprove} />
      </TabsContent>
    </Tabs>
  );
}

function ScopeSelector({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  const opts: { value: Scope; label: string }[] = [
    { value: "my", label: "Мои" },
    { value: "team", label: "Команда" },
    { value: "all", label: "Все" },
  ];
  return (
    <div className="border-border bg-card inline-flex rounded-md border p-0.5">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-sm ${
            scope === o.value
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Командировки ───────── */

function TripsTab({ scope, canApprove }: { scope: Scope; canApprove: boolean }) {
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Trip | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/trips?scope=${scope}`);
      setTrips(res.ok ? ((await res.json()) as Trip[]) : []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (openId) {
    return (
      <TripDetailPanel
        tripId={openId}
        canApprove={canApprove}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  async function remove(id: string) {
    const res = await fetch(`/api/travel/trips/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Командировка удалена");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Новая командировка
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : trips.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Plane className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Командировок пока нет.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <div
              key={t.id}
              className="border-border bg-card hover:border-primary flex flex-col rounded-lg border p-4 transition-colors"
            >
              <button type="button" onClick={() => setOpenId(t.id)} className="min-w-0 text-left">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-foreground truncate font-semibold">{t.destination}</p>
                  <Badge variant={TRIP_STATUS[t.status]?.variant ?? "secondary"}>
                    {TRIP_STATUS[t.status]?.label ?? t.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t.startDate} — {t.endDate}
                </p>
                {scope !== "my" ? (
                  <p className="text-muted-foreground mt-0.5 text-xs">{t.userName}</p>
                ) : null}
              </button>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Receipt className="h-3.5 w-3.5" />
                  {t.expenseCount} · {money(t.expenseTotal, "UZS")}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setOpenId(t.id)}
                >
                  Открыть
                </Button>
                {t.status === "DRAFT" || t.status === "REJECTED" ? (
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <TripDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function TripDetailPanel({
  tripId,
  canApprove,
  onBack,
}: {
  tripId: string;
  canApprove: boolean;
  onBack: () => void;
}) {
  const [trip, setTrip] = React.useState<TripDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [expenseDialog, setExpenseDialog] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/trips/${tripId}`);
      setTrip(res.ok ? ((await res.json()) as TripDetail) : null);
    } catch {
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/travel/trips/${tripId}/submit`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      toast.success("Отправлено на одобрение");
      await load();
    }
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    const res = await fetch(`/api/travel/trips/${tripId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(decision === "APPROVED" ? "Командировка одобрена" : "Командировка отклонена");
      await load();
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!trip) return <p className="text-muted-foreground text-sm">Не найдено.</p>;

  const st = TRIP_STATUS[trip.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Все командировки
        </Button>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-lg font-semibold">{trip.destination}</h2>
          <p className="text-muted-foreground text-xs">
            {trip.userName} · {trip.startDate} — {trip.endDate}
          </p>
        </div>
        <Badge variant={st?.variant ?? "secondary"} className="ml-auto">
          {st?.label ?? trip.status}
        </Badge>
      </div>

      {trip.purpose ? (
        <p className="border-border bg-card text-foreground rounded-lg border p-3 text-sm">
          {trip.purpose}
        </p>
      ) : null}

      {trip.status === "REJECTED" && trip.approverComment ? (
        <p className="bg-danger-light text-danger rounded-lg p-3 text-sm">
          Причина отказа: {trip.approverComment}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {trip.status === "DRAFT" || trip.status === "REJECTED" ? (
          <Button size="sm" onClick={submit} loading={busy}>
            <Send className="h-4 w-4" />
            На одобрение
          </Button>
        ) : null}
        {canApprove && trip.status === "SUBMITTED" ? (
          <>
            <Button size="sm" variant="success" onClick={() => decide("APPROVED")} loading={busy}>
              <Check className="h-4 w-4" />
              Одобрить
            </Button>
            <Button size="sm" variant="danger" onClick={() => decide("REJECTED")} loading={busy}>
              <X className="h-4 w-4" />
              Отклонить
            </Button>
          </>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => setExpenseDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Расход
        </Button>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-sm font-medium">
          Расходы · итого {money(trip.expenseTotal, "UZS")}
        </p>
        {trip.expenses.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Расходов нет.
          </div>
        ) : (
          <div className="border-border divide-border bg-card divide-y rounded-lg border">
            {trip.expenses.map((e) => (
              <ExpenseRow key={e.id} expense={e} canApprove={canApprove} onChanged={load} compact />
            ))}
          </div>
        )}
      </div>

      <ExpenseDialog
        open={expenseDialog}
        onOpenChange={setExpenseDialog}
        editing={null}
        presetTripId={trip.id}
        onSaved={load}
      />
    </div>
  );
}

function TripDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Trip | null;
  onSaved: () => Promise<void>;
}) {
  const [destination, setDestination] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setDestination(editing?.destination ?? "");
      setPurpose(editing?.purpose ?? "");
      setStartDate(editing?.startDate ?? "");
      setEndDate(editing?.endDate ?? "");
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (destination.trim().length < 2) {
      setError("Укажите направление");
      return;
    }
    if (!startDate || !endDate) {
      setError("Укажите даты");
      return;
    }
    if (endDate < startDate) {
      setError("Дата окончания раньше начала");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      destination: destination.trim(),
      purpose: purpose.trim() || undefined,
      startDate,
      endDate,
    };
    try {
      const res = await fetch(editing ? `/api/travel/trips/${editing.id}` : "/api/travel/trips", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Командировка обновлена" : "Командировка создана");
      onOpenChange(false);
      await onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить командировку" : "Новая командировка"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-dest">Направление</Label>
            <Input
              id="trip-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Москва, конференция"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trip-start">Начало</Label>
              <Input
                id="trip-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-end">Окончание</Label>
              <Input
                id="trip-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trip-purpose">Цель</Label>
            <textarea
              id="trip-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
              placeholder="Цель поездки, задачи…"
            />
          </div>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Сохраняем…">
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Расходы ───────── */

function ExpensesTab({ scope, canApprove }: { scope: Scope; canApprove: boolean }) {
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/expenses?scope=${scope}`);
      setExpenses(res.ok ? ((await res.json()) as Expense[]) : []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Новый расход
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : expenses.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Расходов пока нет.
        </div>
      ) : (
        <div className="border-border divide-border bg-card divide-y rounded-lg border">
          {expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              canApprove={canApprove}
              onChanged={load}
              showOwner={scope !== "my"}
            />
          ))}
        </div>
      )}

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={null} onSaved={load} />
    </div>
  );
}

function ExpenseRow({
  expense: e,
  canApprove,
  onChanged,
  showOwner,
  compact,
}: {
  expense: Expense;
  canApprove: boolean;
  onChanged: () => Promise<void>;
  showOwner?: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const st = EXPENSE_STATUS[e.status];

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    const res = await fetch(`/api/travel/expenses/${e.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setBusy(false);
    if (res.ok) await onChanged();
  }

  async function remove() {
    const res = await fetch(`/api/travel/expenses/${e.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) await onChanged();
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-medium">{money(e.amount, e.currency)}</span>
          <Badge variant="outline">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
          <Badge variant={st?.variant ?? "secondary"}>{st?.label ?? e.status}</Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {e.spentAt}
          {showOwner ? ` · ${e.userName}` : ""}
          {e.description ? ` · ${e.description}` : ""}
        </p>
      </div>
      {canApprove && e.status === "PENDING" ? (
        <>
          <button
            type="button"
            onClick={() => decide("APPROVED")}
            disabled={busy}
            className="hover:bg-success-light text-muted-foreground hover:text-success rounded p-1.5 disabled:opacity-40"
            aria-label="Одобрить"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => decide("REJECTED")}
            disabled={busy}
            className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5 disabled:opacity-40"
            aria-label="Отклонить"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : null}
      {e.status !== "APPROVED" && !compact ? (
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="text-muted-foreground hover:text-foreground rounded px-2 py-1 text-xs"
        >
          Изменить
        </button>
      ) : null}
      {e.status !== "APPROVED" ? (
        <button
          type="button"
          onClick={remove}
          className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1"
          aria-label="Удалить"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <ExpenseDialog open={editOpen} onOpenChange={setEditOpen} editing={e} onSaved={onChanged} />
    </div>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  editing,
  presetTripId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Expense | null;
  presetTripId?: string;
  onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = React.useState<string>("TRAVEL");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("UZS");
  const [spentAt, setSpentAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tripId, setTripId] = React.useState("");
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setCategory(editing?.category ?? "TRAVEL");
      setAmount(editing ? String(editing.amount) : "");
      setCurrency(editing?.currency ?? "UZS");
      setSpentAt(editing?.spentAt ?? new Date().toISOString().slice(0, 10));
      setDescription(editing?.description ?? "");
      setTripId(editing?.tripId ?? presetTripId ?? "");
      setError(null);
      if (!presetTripId) {
        void fetch("/api/travel/trips?scope=my")
          .then((r) => (r.ok ? r.json() : []))
          .then((t: Trip[]) => setTrips(t))
          .catch(() => setTrips([]));
      }
    }
  }, [open, editing, presetTripId]);

  async function save() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Введите сумму");
      return;
    }
    if (!spentAt) {
      setError("Укажите дату");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      category,
      amount: amt,
      currency: currency.trim().toUpperCase() || "UZS",
      spentAt,
      description: description.trim() || undefined,
      tripId: tripId || undefined,
    };
    try {
      const res = await fetch(
        editing ? `/api/travel/expenses/${editing.id}` : "/api/travel/expenses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Расход обновлён" : "Расход добавлен");
      onOpenChange(false);
      await onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить расход" : "Новый расход"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exp-cat">Категория</Label>
              <select
                id="exp-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Дата</Label>
              <Input
                id="exp-date"
                type="date"
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="exp-amount">Сумма</Label>
              <Input
                id="exp-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-cur">Валюта</Label>
              <Input
                id="exp-cur"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
                placeholder="UZS"
              />
            </div>
          </div>
          {!presetTripId ? (
            <div className="space-y-2">
              <Label htmlFor="exp-trip">Командировка (опционально)</Label>
              <select
                id="exp-trip"
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">— без командировки —</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.destination} ({t.startDate})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="exp-desc">Описание</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Назначение расхода…"
            />
          </div>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Сохраняем…">
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
