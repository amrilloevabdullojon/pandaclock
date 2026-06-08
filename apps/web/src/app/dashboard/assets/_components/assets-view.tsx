"use client";

import * as React from "react";
import { ChevronLeft, Laptop, Plus, RotateCcw, Trash2, UserPlus } from "lucide-react";
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

export interface EmployeeOption {
  id: string;
  name: string;
}

interface AssignmentRecord {
  id: string;
  userId: string;
  userName: string;
  assignedByName: string | null;
  assignedAt: string;
  returnedAt: string | null;
  note: string | null;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  purchaseDate: string | null;
  cost: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
}

interface AssetDetail extends Asset {
  history: AssignmentRecord[];
}

const CATEGORIES = [
  "LAPTOP",
  "PHONE",
  "MONITOR",
  "PERIPHERAL",
  "FURNITURE",
  "VEHICLE",
  "OTHER",
] as const;
const CATEGORY_LABELS: Record<string, string> = {
  LAPTOP: "Ноутбук",
  PHONE: "Телефон",
  MONITOR: "Монитор",
  PERIPHERAL: "Периферия",
  FURNITURE: "Мебель",
  VEHICLE: "Транспорт",
  OTHER: "Прочее",
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" | "secondary" }
> = {
  AVAILABLE: { label: "Свободен", variant: "success" },
  ASSIGNED: { label: "Выдан", variant: "info" },
  MAINTENANCE: { label: "Обслуживание", variant: "warning" },
  RETIRED: { label: "Списан", variant: "secondary" },
};

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${currency}`;
}

export function AssetsView({ employees }: { employees: EmployeeOption[] }) {
  const canManage = usePermission("assets:write");
  return (
    <Tabs defaultValue={canManage ? "inventory" : "my"} className="space-y-4">
      <TabsList>
        {canManage ? <TabsTrigger value="inventory">Инвентарь</TabsTrigger> : null}
        <TabsTrigger value="my">Мои активы</TabsTrigger>
      </TabsList>
      {canManage ? (
        <TabsContent value="inventory">
          <InventoryTab employees={employees} />
        </TabsContent>
      ) : null}
      <TabsContent value="my">
        <MyTab />
      </TabsContent>
    </Tabs>
  );
}

/* ───────── Мои активы ───────── */

function MyTab() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/assets/my");
        setAssets(res.ok ? ((await res.json()) as Asset[]) : []);
      } catch {
        setAssets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (assets.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        <Laptop className="mx-auto mb-2 h-8 w-8 opacity-40" />
        За вами не закреплено активов.
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((a) => (
        <div key={a.id} className="border-border bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground font-semibold">{a.name}</p>
            <Badge variant="outline">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
          </div>
          {a.serialNumber ? (
            <p className="text-muted-foreground mt-0.5 text-xs">S/N: {a.serialNumber}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ───────── Инвентарь ───────── */

function InventoryTab({ employees }: { employees: EmployeeOption[] }) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [q, setQ] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [assignFor, setAssignFor] = React.useState<Asset | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/assets?${params.toString()}`);
      setAssets(res.ok ? ((await res.json()) as Asset[]) : []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [status, category, q]);

  React.useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  if (openId) {
    return (
      <AssetDetailPanel
        assetId={openId}
        employees={employees}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  async function returnAsset(id: string) {
    const res = await fetch(`/api/assets/${id}/return`, { method: "POST" });
    if (res.ok) {
      toast.success("Актив принят обратно");
      await load();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Актив удалён");
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по названию / S/N…"
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_BADGE).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Все категории</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить актив
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : assets.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <Laptop className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Активов не найдено.
        </div>
      ) : (
        <div className="border-border divide-border bg-card divide-y rounded-lg border">
          {assets.map((a) => {
            const sb = STATUS_BADGE[a.status];
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setOpenId(a.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">{a.name}</span>
                    <Badge variant="outline">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
                    <Badge variant={sb?.variant ?? "secondary"}>{sb?.label ?? a.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {a.serialNumber ? `S/N: ${a.serialNumber}` : "без S/N"}
                    {a.assignedToName ? ` · ${a.assignedToName}` : ""}
                  </p>
                </button>
                {a.status === "ASSIGNED" ? (
                  <Button size="sm" variant="outline" onClick={() => returnAsset(a.id)}>
                    <RotateCcw className="h-4 w-4" />
                    Вернуть
                  </Button>
                ) : a.status !== "RETIRED" ? (
                  <Button size="sm" variant="outline" onClick={() => setAssignFor(a)}>
                    <UserPlus className="h-4 w-4" />
                    Выдать
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AssetDialog open={createOpen} onOpenChange={setCreateOpen} editing={null} onSaved={load} />
      {assignFor ? (
        <AssignDialog
          asset={assignFor}
          employees={employees}
          onClose={() => setAssignFor(null)}
          onDone={() => {
            setAssignFor(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function AssetDetailPanel({
  assetId,
  employees,
  onBack,
}: {
  assetId: string;
  employees: EmployeeOption[];
  onBack: () => void;
}) {
  const [asset, setAsset] = React.useState<AssetDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      setAsset(res.ok ? ((await res.json()) as AssetDetail) : null);
    } catch {
      setAsset(null);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function returnAsset() {
    const res = await fetch(`/api/assets/${assetId}/return`, { method: "POST" });
    if (res.ok) {
      toast.success("Актив принят обратно");
      await load();
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!asset) return <p className="text-muted-foreground text-sm">Не найдено.</p>;
  const sb = STATUS_BADGE[asset.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />К инвентарю
        </Button>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-lg font-semibold">{asset.name}</h2>
          <p className="text-muted-foreground text-xs">
            {CATEGORY_LABELS[asset.category] ?? asset.category}
            {asset.serialNumber ? ` · S/N ${asset.serialNumber}` : ""}
          </p>
        </div>
        <Badge variant={sb?.variant ?? "secondary"} className="ml-auto">
          {sb?.label ?? asset.status}
        </Badge>
      </div>

      <div className="border-border bg-card grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <Field label="Закреплён за" value={asset.assignedToName ?? "—"} />
        <Field
          label="Стоимость"
          value={asset.cost !== null ? money(asset.cost, asset.currency) : "—"}
        />
        <Field label="Дата покупки" value={asset.purchaseDate ?? "—"} />
        <Field label="Добавлен" value={new Date(asset.createdAt).toLocaleDateString("ru-RU")} />
        {asset.notes ? <Field label="Заметки" value={asset.notes} full /> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {asset.status === "ASSIGNED" ? (
          <Button size="sm" variant="outline" onClick={returnAsset}>
            <RotateCcw className="h-4 w-4" />
            Вернуть
          </Button>
        ) : asset.status !== "RETIRED" ? (
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Выдать
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
          Изменить
        </Button>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-sm font-medium">История выдачи</p>
        {asset.history.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Актив ещё не выдавался.
          </div>
        ) : (
          <div className="border-border divide-border bg-card divide-y rounded-lg border">
            {asset.history.map((h) => (
              <div key={h.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground font-medium">{h.userName}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(h.assignedAt).toLocaleDateString("ru-RU")}
                    {" — "}
                    {h.returnedAt ? new Date(h.returnedAt).toLocaleDateString("ru-RU") : "сейчас"}
                  </span>
                </div>
                {h.note ? <p className="text-muted-foreground mt-0.5 text-xs">{h.note}</p> : null}
                {h.assignedByName ? (
                  <p className="text-muted-foreground mt-0.5 text-xs">Выдал: {h.assignedByName}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <AssetDialog open={editOpen} onOpenChange={setEditOpen} editing={asset} onSaved={load} />
      {assignOpen ? (
        <AssignDialog
          asset={asset}
          employees={employees}
          onClose={() => setAssignOpen(false)}
          onDone={() => {
            setAssignOpen(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function AssetDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Asset | null;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("LAPTOP");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [status, setStatus] = React.useState("AVAILABLE");
  const [purchaseDate, setPurchaseDate] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [currency, setCurrency] = React.useState("UZS");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isAssigned = editing?.status === "ASSIGNED";

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setCategory(editing?.category ?? "LAPTOP");
      setSerialNumber(editing?.serialNumber ?? "");
      setStatus(editing && editing.status !== "ASSIGNED" ? editing.status : "AVAILABLE");
      setPurchaseDate(editing?.purchaseDate ?? "");
      setCost(editing?.cost != null ? String(editing.cost) : "");
      setCurrency(editing?.currency ?? "UZS");
      setNotes(editing?.notes ?? "");
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (name.trim().length < 2) {
      setError("Введите название");
      return;
    }
    setSaving(true);
    setError(null);
    const costNum = cost.trim() ? Number(cost) : undefined;
    const payload: Record<string, unknown> = {
      name: name.trim(),
      category,
      serialNumber: serialNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      cost: costNum && costNum > 0 ? costNum : undefined,
      currency: currency.trim().toUpperCase() || "UZS",
      notes: notes.trim() || undefined,
    };
    // Статус меняем только для существующего невыданного актива.
    if (editing && !isAssigned) payload.status = status;
    try {
      const res = await fetch(editing ? `/api/assets/${editing.id}` : "/api/assets", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Актив обновлён" : "Актив добавлен");
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
          <DialogTitle>{editing ? "Изменить актив" : "Новый актив"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="as-name">Название</Label>
            <Input
              id="as-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MacBook Pro 14"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="as-cat">Категория</Label>
              <select
                id="as-cat"
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
              <Label htmlFor="as-serial">Серийный номер</Label>
              <Input
                id="as-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="C02XXXX"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="as-cost">Стоимость</Label>
              <Input
                id="as-cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-cur">Валюта</Label>
              <Input
                id="as-cur"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="as-date">Дата покупки</Label>
              <Input
                id="as-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            {editing && !isAssigned ? (
              <div className="space-y-2">
                <Label htmlFor="as-status">Статус</Label>
                <select
                  id="as-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="AVAILABLE">Свободен</option>
                  <option value="MAINTENANCE">Обслуживание</option>
                  <option value="RETIRED">Списан</option>
                </select>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="as-notes">Заметки</Label>
            <textarea
              id="as-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
              placeholder="Комплектация, состояние…"
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

function AssignDialog({
  asset,
  employees,
  onClose,
  onDone,
}: {
  asset: Asset;
  employees: EmployeeOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [userId, setUserId] = React.useState(employees[0]?.id ?? "");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function assign() {
    if (!userId) {
      setError("Выберите сотрудника");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось выдать");
        return;
      }
      toast.success("Актив выдан");
      onDone();
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
          <DialogTitle>Выдать «{asset.name}»</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-user">Сотрудник</Label>
            <select
              id="assign-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-note">Примечание</Label>
            <Input
              id="assign-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Состояние, комплект…"
            />
          </div>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={assign} loading={saving} loadingText="Выдаём…">
              Выдать
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
