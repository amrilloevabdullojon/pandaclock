"use client";

import * as React from "react";
import { Check, ChevronLeft, Plus, Trash2, Wallet } from "lucide-react";
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

interface SalaryRow {
  userId: string;
  userName: string;
  amount: number | null;
  currency: string | null;
  effectiveFrom: string | null;
}

interface PayrollRun {
  id: string;
  period: string;
  status: string;
  payslipCount: number;
  totalNet: number;
  paidAt: string | null;
  createdAt: string;
}

interface Payslip {
  id: string;
  runId: string;
  userId: string;
  userName: string;
  baseAmount: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  currency: string;
  note: string | null;
}

interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
}

interface MyPayslip {
  id: string;
  period: string;
  status: string;
  baseAmount: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  currency: string;
  note: string | null;
  paidAt: string | null;
}

const RUN_STATUS: Record<string, { label: string; variant: "secondary" | "info" | "success" }> = {
  DRAFT: { label: "Черновик", variant: "secondary" },
  APPROVED: { label: "Утверждён", variant: "info" },
  PAID: { label: "Выплачен", variant: "success" },
};

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${currency}`;
}

export function PayrollView({ employeeNames }: { employeeNames: Record<string, string> }) {
  const canManage = usePermission("payroll:write");
  return (
    <Tabs defaultValue={canManage ? "runs" : "my"} className="space-y-4">
      <TabsList>
        {canManage ? <TabsTrigger value="runs">Расчёты</TabsTrigger> : null}
        {canManage ? <TabsTrigger value="salaries">Оклады</TabsTrigger> : null}
        <TabsTrigger value="my">Мои листки</TabsTrigger>
      </TabsList>
      {canManage ? (
        <TabsContent value="runs">
          <RunsTab />
        </TabsContent>
      ) : null}
      {canManage ? (
        <TabsContent value="salaries">
          <SalariesTab employeeNames={employeeNames} />
        </TabsContent>
      ) : null}
      <TabsContent value="my">
        <MyTab />
      </TabsContent>
    </Tabs>
  );
}

/* ───────── Мои листки ───────── */

function MyTab() {
  const [slips, setSlips] = React.useState<MyPayslip[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/payroll/payslips/my");
        setSlips(res.ok ? ((await res.json()) as MyPayslip[]) : []);
      } catch {
        setSlips([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (slips.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        <Wallet className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Расчётных листков пока нет.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {slips.map((s) => {
        const st = RUN_STATUS[s.status];
        return (
          <div key={s.id} className="border-border bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground font-semibold">{s.period}</span>
              <Badge variant={st?.variant ?? "secondary"}>{st?.label ?? s.status}</Badge>
            </div>
            <div className="text-muted-foreground mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <Cell label="Оклад" value={money(s.baseAmount, s.currency)} />
              <Cell label="Премия" value={money(s.bonus, s.currency)} />
              <Cell label="Удержания" value={money(s.deductions, s.currency)} />
              <Cell label="К выплате" value={money(s.netAmount, s.currency)} strong />
            </div>
            {s.note ? <p className="text-muted-foreground mt-2 text-xs">{s.note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={strong ? "text-foreground font-semibold" : "text-foreground"}>{value}</p>
    </div>
  );
}

/* ───────── Оклады ───────── */

function SalariesTab({ employeeNames }: { employeeNames: Record<string, string> }) {
  const [rows, setRows] = React.useState<SalaryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<SalaryRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/salaries");
      setRows(res.ok ? ((await res.json()) as SalaryRow[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <div className="border-border divide-border bg-card divide-y rounded-lg border">
        {rows.map((r) => (
          <div key={r.userId} className="flex items-center gap-3 p-3">
            <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
              {r.userName || employeeNames[r.userId] || "—"}
            </span>
            <span className="text-foreground text-sm">
              {r.amount !== null ? money(r.amount, r.currency ?? "UZS") : "— оклад не задан —"}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
              Изменить
            </Button>
          </div>
        ))}
      </div>

      {editing ? (
        <SalaryDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function SalaryDialog({
  row,
  onClose,
  onSaved,
}: {
  row: SalaryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = React.useState(row.amount != null ? String(row.amount) : "");
  const [currency, setCurrency] = React.useState(row.currency ?? "UZS");
  const [effectiveFrom, setEffectiveFrom] = React.useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = React.useState<
    { id: string; amount: number; currency: string; effectiveFrom: string }[]
  >([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/payroll/salaries/${row.userId}/history`);
        if (res.ok) {
          setHistory(
            (await res.json()) as {
              id: string;
              amount: number;
              currency: string;
              effectiveFrom: string;
            }[],
          );
        }
      } catch {
        setHistory([]);
      }
    })();
  }, [row.userId]);

  async function save() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Введите сумму оклада");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/salaries/${row.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          currency: currency.trim().toUpperCase() || "UZS",
          effectiveFrom,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success("Оклад обновлён");
      onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оклад — {row.userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sal-amount">Оклад (в месяц)</Label>
              <Input
                id="sal-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sal-cur">Валюта</Label>
              <Input
                id="sal-cur"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sal-from">Действует с</Label>
            <Input
              id="sal-from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          {history.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">История окладов</p>
              <div className="border-border divide-border max-h-32 divide-y overflow-y-auto rounded-md border">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="text-muted-foreground flex items-center justify-between px-3 py-1.5 text-xs"
                  >
                    <span>{money(h.amount, h.currency)}</span>
                    <span>с {h.effectiveFrom}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
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

/* ───────── Расчёты ───────── */

function RunsTab() {
  const [runs, setRuns] = React.useState<PayrollRun[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/runs");
      setRuns(res.ok ? ((await res.json()) as PayrollRun[]) : []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (openId) {
    return (
      <RunDetailPanel
        runId={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  async function remove(id: string) {
    const res = await fetch(`/api/payroll/runs/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Период удалён");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Новый период
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : runs.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Wallet className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Расчётных периодов пока нет.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => {
            const st = RUN_STATUS[r.status];
            return (
              <div
                key={r.id}
                className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-semibold">{r.period}</span>
                    <Badge variant={st?.variant ?? "secondary"}>{st?.label ?? r.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {r.payslipCount} сотр. · фонд {money(r.totalNet, "UZS")}
                  </p>
                </button>
                <Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)}>
                  Открыть
                </Button>
                {r.status === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <CreateRunDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={load} />
    </div>
  );
}

function CreateRunDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [period, setPeriod] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const now = new Date();
      const month = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
      setPeriod(month.charAt(0).toUpperCase() + month.slice(1));
      setError(null);
    }
  }, [open]);

  async function save() {
    if (period.trim().length < 2) {
      setError("Укажите название периода");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: period.trim() }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось создать");
        return;
      }
      toast.success("Период создан — листки сгенерированы из окладов");
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
          <DialogTitle>Новый расчётный период</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="run-period">Период</Label>
            <Input
              id="run-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Июнь 2026"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Листки создаются автоматически из текущих окладов активных сотрудников.
            </p>
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
            <Button onClick={save} loading={saving} loadingText="Создаём…">
              Создать
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RunDetailPanel({ runId, onBack }: { runId: string; onBack: () => void }) {
  const [run, setRun] = React.useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState<Payslip | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/runs/${runId}`);
      setRun(res.ok ? ((await res.json()) as PayrollRunDetail) : null);
    } catch {
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(status: "APPROVED" | "PAID") {
    setBusy(true);
    const res = await fetch(`/api/payroll/runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(status === "APPROVED" ? "Период утверждён" : "Зарплата выплачена");
      await load();
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!run) return <p className="text-muted-foreground text-sm">Не найдено.</p>;
  const st = RUN_STATUS[run.status];
  const isDraft = run.status === "DRAFT";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />К периодам
        </Button>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-lg font-semibold">{run.period}</h2>
          <p className="text-muted-foreground text-xs">
            {run.payslipCount} сотр. · фонд {money(run.totalNet, "UZS")}
          </p>
        </div>
        <Badge variant={st?.variant ?? "secondary"} className="ml-auto">
          {st?.label ?? run.status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {run.status === "DRAFT" ? (
          <Button size="sm" variant="success" onClick={() => setStatus("APPROVED")} loading={busy}>
            <Check className="h-4 w-4" />
            Утвердить
          </Button>
        ) : null}
        {run.status === "APPROVED" ? (
          <Button size="sm" onClick={() => setStatus("PAID")} loading={busy}>
            Отметить выплаченным
          </Button>
        ) : null}
      </div>

      <div className="border-border bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-border border-b text-left text-xs">
            <tr>
              <th className="p-3 font-medium">Сотрудник</th>
              <th className="p-3 text-right font-medium">Оклад</th>
              <th className="p-3 text-right font-medium">Премия</th>
              <th className="p-3 text-right font-medium">Удержания</th>
              <th className="p-3 text-right font-medium">К выплате</th>
              {isDraft ? <th className="p-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {run.payslips.map((p) => (
              <tr key={p.id}>
                <td className="text-foreground p-3">{p.userName}</td>
                <td className="text-foreground p-3 text-right">
                  {money(p.baseAmount, p.currency)}
                </td>
                <td className="text-foreground p-3 text-right">{money(p.bonus, p.currency)}</td>
                <td className="text-foreground p-3 text-right">
                  {money(p.deductions, p.currency)}
                </td>
                <td className="text-foreground p-3 text-right font-semibold">
                  {money(p.netAmount, p.currency)}
                </td>
                {isDraft ? (
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      Изменить
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            {run.payslips.length === 0 ? (
              <tr>
                <td colSpan={isDraft ? 6 : 5} className="text-muted-foreground p-6 text-center">
                  Нет листков. Назначьте оклады сотрудникам и пересоздайте период.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <PayslipDialog
          payslip={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function PayslipDialog({
  payslip,
  onClose,
  onSaved,
}: {
  payslip: Payslip;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bonus, setBonus] = React.useState(String(payslip.bonus));
  const [deductions, setDeductions] = React.useState(String(payslip.deductions));
  const [note, setNote] = React.useState(payslip.note ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const net = payslip.baseAmount + (Number(bonus) || 0) - (Number(deductions) || 0);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/payslips/${payslip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonus: Number(bonus) || 0,
          deductions: Number(deductions) || 0,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success("Листок обновлён");
      onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Листок — {payslip.userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Оклад: {money(payslip.baseAmount, payslip.currency)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ps-bonus">Премия</Label>
              <Input
                id="ps-bonus"
                type="number"
                min="0"
                step="0.01"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-ded">Удержания</Label>
              <Input
                id="ps-ded"
                type="number"
                min="0"
                step="0.01"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ps-note">Примечание</Label>
            <Input
              id="ps-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Напр.: премия за проект"
            />
          </div>
          <p className="text-foreground text-sm font-semibold">
            К выплате: {money(net, payslip.currency)}
          </p>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
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
