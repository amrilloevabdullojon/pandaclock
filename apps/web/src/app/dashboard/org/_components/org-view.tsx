"use client";

import * as React from "react";
import { Crown, Network, Plus, Trash2, Users } from "lucide-react";
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

export interface DepartmentOption {
  id: string;
  name: string;
}

interface OrgMember {
  id: string;
  fullName: string;
  position: string | null;
  avatarUrl: string | null;
  isHead: boolean;
}

interface OrgDepartment {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  headName: string | null;
  members: OrgMember[];
}

interface OrgChart {
  departments: OrgDepartment[];
  unassigned: OrgMember[];
}

interface StaffPosition {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  title: string;
  plannedCount: number;
  filled: number;
  notes: string | null;
}

export function OrgView({ departments }: { departments: DepartmentOption[] }) {
  const canWrite = usePermission("org:write");
  return (
    <Tabs defaultValue="chart" className="space-y-4">
      <TabsList>
        <TabsTrigger value="chart">Структура</TabsTrigger>
        {canWrite ? <TabsTrigger value="staffing">Штатное расписание</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="chart">
        <ChartTab />
      </TabsContent>
      {canWrite ? (
        <TabsContent value="staffing">
          <StaffingTab departments={departments} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

/* ───────── Оргструктура ───────── */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ChartTab() {
  const [chart, setChart] = React.useState<OrgChart | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/org/chart");
        setChart(res.ok ? ((await res.json()) as OrgChart) : null);
      } catch {
        setChart(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const childrenByParent = React.useMemo(() => {
    const map = new Map<string | null, OrgDepartment[]>();
    if (!chart) return map;
    const ids = new Set(chart.departments.map((d) => d.id));
    for (const d of chart.departments) {
      const key = d.parentId && ids.has(d.parentId) ? d.parentId : null;
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return map;
  }, [chart]);

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!chart) return <p className="text-muted-foreground text-sm">Не удалось загрузить.</p>;
  if (chart.departments.length === 0 && chart.unassigned.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        <Network className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Структура пуста. Создайте отделы в разделе «Отделы».
      </div>
    );
  }

  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="space-y-3">
      {roots.map((d) => (
        <DeptNode key={d.id} dept={d} childrenByParent={childrenByParent} depth={0} />
      ))}
      {chart.unassigned.length > 0 ? (
        <div className="border-border bg-card rounded-lg border border-dashed p-4">
          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Users className="h-4 w-4" />
            Без отдела ({chart.unassigned.length})
          </p>
          <MemberGrid members={chart.unassigned} />
        </div>
      ) : null}
    </div>
  );
}

function DeptNode({
  dept,
  childrenByParent,
  depth,
}: {
  dept: OrgDepartment;
  childrenByParent: Map<string | null, OrgDepartment[]>;
  depth: number;
}) {
  const kids = childrenByParent.get(dept.id) ?? [];
  return (
    <div className={depth > 0 ? "border-border ml-4 border-l pl-4" : ""}>
      <div className="border-border bg-card rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-foreground font-bold">{dept.name}</h3>
          <Badge variant="secondary">{dept.members.length} чел.</Badge>
          {dept.headName ? (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Crown className="text-gold h-3.5 w-3.5" />
              {dept.headName}
            </span>
          ) : null}
        </div>
        {dept.members.length > 0 ? <MemberGrid members={dept.members} className="mt-3" /> : null}
      </div>
      {kids.length > 0 ? (
        <div className="mt-3 space-y-3">
          {kids.map((k) => (
            <DeptNode key={k.id} dept={k} childrenByParent={childrenByParent} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MemberGrid({ members, className }: { members: OrgMember[]; className?: string }) {
  return (
    <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ""}`}>
      {members.map((m) => (
        <div key={m.id} className="bg-muted/40 flex items-center gap-2 rounded-md p-2">
          <span className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">
            {initials(m.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-foreground flex items-center gap-1 truncate text-sm font-medium">
              {m.fullName}
              {m.isHead ? <Crown className="text-gold h-3 w-3 shrink-0" /> : null}
            </p>
            {m.position ? (
              <p className="text-muted-foreground truncate text-xs">{m.position}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Штатное расписание ───────── */

function StaffingTab({ departments }: { departments: DepartmentOption[] }) {
  const [rows, setRows] = React.useState<StaffPosition[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffPosition | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/staffing");
      setRows(res.ok ? ((await res.json()) as StaffPosition[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    const res = await fetch(`/api/org/staffing/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Позиция удалена");
      await load();
    }
  }

  const totals = rows.reduce(
    (acc, r) => ({ planned: acc.planned + r.plannedCount, filled: acc.filled + r.filled }),
    { planned: 0, filled: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Заполнено {totals.filled} из {totals.planned} плановых ставок
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Позиция
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : rows.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Позиции штатного расписания не заданы.
        </div>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-border border-b text-left text-xs">
              <tr>
                <th className="p-3 font-medium">Позиция</th>
                <th className="p-3 font-medium">Отдел</th>
                <th className="p-3 text-center font-medium">План</th>
                <th className="p-3 text-center font-medium">Факт</th>
                <th className="p-3 text-center font-medium">Вакансий</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((r) => {
                const gap = r.plannedCount - r.filled;
                return (
                  <tr key={r.id}>
                    <td className="text-foreground p-3 font-medium">{r.title}</td>
                    <td className="text-muted-foreground p-3">{r.departmentName ?? "—"}</td>
                    <td className="text-foreground p-3 text-center">{r.plannedCount}</td>
                    <td className="text-foreground p-3 text-center">{r.filled}</td>
                    <td className="p-3 text-center">
                      {gap > 0 ? (
                        <Badge variant="warning">{gap}</Badge>
                      ) : gap < 0 ? (
                        <Badge variant="danger">+{-gap}</Badge>
                      ) : (
                        <Badge variant="success">0</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                      >
                        Изменить
                      </Button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="hover:bg-danger-light text-muted-foreground hover:text-danger ml-1 rounded p-1.5"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StaffingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departments={departments}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

function StaffingDialog({
  open,
  onOpenChange,
  departments,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: DepartmentOption[];
  editing: StaffPosition | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [plannedCount, setPlannedCount] = React.useState("1");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDepartmentId(editing?.departmentId ?? "");
      setPlannedCount(editing ? String(editing.plannedCount) : "1");
      setNotes(editing?.notes ?? "");
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (title.trim().length < 1) {
      setError("Введите название позиции");
      return;
    }
    const planned = Number(plannedCount);
    if (!Number.isInteger(planned) || planned < 1) {
      setError("Плановое число — целое ≥ 1");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/org/staffing/${editing.id}` : "/api/org/staffing", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          departmentId: departmentId || undefined,
          plannedCount: planned,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Позиция обновлена" : "Позиция добавлена");
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
          <DialogTitle>{editing ? "Изменить позицию" : "Новая позиция"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sp-title">Название (как в профиле сотрудника)</Label>
            <Input
              id="sp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Frontend"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sp-dept">Отдел</Label>
              <select
                id="sp-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="border-border bg-card focus-ring h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">— вся компания —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-planned">План (ставок)</Label>
              <Input
                id="sp-planned"
                type="number"
                min="1"
                value={plannedCount}
                onChange={(e) => setPlannedCount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-notes">Заметки</Label>
            <Input
              id="sp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий…"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            «Факт» считается по сотрудникам с совпадающей должностью в этом отделе.
          </p>
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
