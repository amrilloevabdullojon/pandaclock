"use client";

import * as React from "react";
import { Search } from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox,
  type ComboboxOption,
} from "@pandaclock/ui";
import { useQueryState, useResetQueryState } from "@/lib/hooks/use-query-state";
import { FilterBar, type ActiveFilter } from "../../_components/filter-bar";

interface DepartmentOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Активен" },
  { value: "PENDING", label: "Приглашён" },
  { value: "SUSPENDED", label: "Деактивирован" },
  { value: "TERMINATED", label: "Уволен" },
];

export function EmployeesFilters({ departments }: { departments: DepartmentOption[] }) {
  const [search, setSearch] = useQueryState("search", "", { debounce: 300 });
  const [departmentId, setDepartmentId] = useQueryState("departmentId", "");
  const [status, setStatus] = useQueryState("status", "");
  const reset = useResetQueryState(["search", "departmentId", "status", "page"]);

  const deptOptions: ComboboxOption[] = React.useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );

  const active: ActiveFilter[] = [];
  if (search) {
    active.push({
      key: "search",
      label: `Поиск: «${search}»`,
      onClear: () => setSearch(""),
    });
  }
  if (departmentId) {
    const dept = departments.find((d) => d.id === departmentId);
    if (dept) {
      active.push({
        key: "department",
        label: `Отдел: ${dept.name}`,
        onClear: () => setDepartmentId(""),
      });
    }
  }
  if (status) {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    if (statusOption) {
      active.push({
        key: "status",
        label: `Статус: ${statusOption.label}`,
        onClear: () => setStatus(""),
      });
    }
  }

  return (
    <FilterBar active={active} onClearAll={active.length > 0 ? reset : undefined}>
      <Input
        prefix={<Search className="h-4 w-4" />}
        placeholder="Поиск по имени или email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="min-w-48">
        <Combobox
          options={deptOptions}
          value={departmentId}
          onChange={setDepartmentId}
          placeholder="Все отделы"
          searchPlaceholder="Найти отдел…"
        />
      </div>
      <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Все статусы" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  );
}
