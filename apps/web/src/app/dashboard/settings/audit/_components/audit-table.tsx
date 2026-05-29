"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  cn,
} from "@pandaclock/ui";
import { FilterBar, type ActiveFilter } from "../../../_components/filter-bar";

interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

interface Props {
  initialItems: AuditEntry[];
  initialCursor: string | null;
  entityTypes: string[];
}

const METHOD_TONE: Record<string, "info" | "primary" | "warning" | "danger" | "neutral"> = {
  POST: "info",
  PATCH: "primary",
  PUT: "primary",
  DELETE: "danger",
};

export function AuditTable({ initialItems, initialCursor, entityTypes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  const entityType = searchParams.get("entityType") ?? "";
  const actionQuery = searchParams.get("action") ?? "";

  React.useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
  }, [initialItems, initialCursor]);

  function updateParam(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`/dashboard/settings/audit?${sp.toString()}`);
  }

  function clearAll() {
    router.replace("/dashboard/settings/audit");
  }

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("limit", "50");
      qs.set("cursor", cursor);
      const response = await fetch(`/api/audit?${qs.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { items: AuditEntry[]; nextCursor: string | null };
        setItems((current) => [...current, ...data.items]);
        setCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }

  const active: ActiveFilter[] = [];
  if (entityType)
    active.push({
      key: "entityType",
      label: `Тип: ${entityType}`,
      onClear: () => updateParam("entityType", ""),
    });
  if (actionQuery)
    active.push({
      key: "action",
      label: `Action: ${actionQuery}`,
      onClear: () => updateParam("action", ""),
    });

  return (
    <div className="space-y-4">
      <FilterBar active={active} onClearAll={active.length > 0 ? clearAll : undefined}>
        <Input
          prefix={<Search className="h-4 w-4" />}
          placeholder="Поиск action (POST /tasks)…"
          defaultValue={actionQuery}
          onBlur={(e) => updateParam("action", e.target.value.trim())}
          className="max-w-xs"
        />
        <Select
          value={entityType || "all"}
          onValueChange={(v) => updateParam("entityType", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все типы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Когда</TableHead>
                <TableHead>Кто</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Сущность</TableHead>
                <TableHead className="text-right">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => {
                const method = entry.action.split(" ")[0] ?? "";
                const path = entry.action.slice(method.length).trim();
                return (
                  <TableRow key={entry.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-foreground text-xs font-semibold tabular-nums">
                          {new Date(entry.createdAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.userName ? (
                        <span className="text-sm font-semibold">{entry.userName}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">система</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            METHOD_TONE[method] === "info"
                              ? "info"
                              : METHOD_TONE[method] === "primary"
                                ? "default"
                                : METHOD_TONE[method] === "danger"
                                  ? "danger"
                                  : "secondary"
                          }
                        >
                          {method}
                        </Badge>
                        <code
                          className={cn(
                            "text-muted-foreground rounded-xs px-1 py-0.5 font-mono text-xs",
                          )}
                        >
                          {path}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tag tone="neutral" size="sm">
                        {entry.entityType}
                      </Tag>
                      {entry.entityId && (
                        <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                          {entry.entityId.slice(0, 8)}…
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {entry.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {cursor && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loading} loadingText="Загружаем…">
            Показать больше
          </Button>
        </div>
      )}
    </div>
  );
}
