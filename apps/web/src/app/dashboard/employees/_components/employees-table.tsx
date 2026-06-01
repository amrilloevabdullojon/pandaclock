"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Power, PowerOff, X } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SelectionToolbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useRowSelection,
} from "@pandaclock/ui";

interface EmployeeRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  position: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
}

interface Props {
  items: EmployeeRow[];
}

export function EmployeesTable({ items }: Props) {
  const router = useRouter();
  const selection = useRowSelection<string>();
  const [pendingAction, setPendingAction] = React.useState<"SUSPENDED" | "ACTIVE" | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Можно выбрать только non-OWNER.
  const selectableIds = React.useMemo(
    () => items.filter((e) => e.role !== "OWNER").map((e) => e.id),
    [items],
  );

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selection.isSelected(id));
  const someSelected =
    selection.count > 0 && !allSelected && selectableIds.some((id) => selection.isSelected(id));

  async function applyBulk(status: "ACTIVE" | "SUSPENDED") {
    setSubmitting(true);
    try {
      const ids = Array.from(selection.selected);
      const response = await fetch("/api/employees/bulk/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!response.ok) {
        toast.error("Не удалось применить");
        return;
      }
      const data = (await response.json()) as { updated: number };
      toast.success(
        status === "ACTIVE" ? `Активировано: ${data.updated}` : `Деактивировано: ${data.updated}`,
      );
      selection.clear();
      setPendingAction(null);
      router.refresh();
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-4">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={() => selection.selectAll(selectableIds)}
                aria-label="Выбрать всех на странице"
                disabled={selectableIds.length === 0}
              />
            </TableHead>
            <TableHead>Сотрудник</TableHead>
            <TableHead>Должность</TableHead>
            <TableHead>Отдел</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead aria-hidden />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((employee) => {
            const isOwner = employee.role === "OWNER";
            const isChecked = selection.isSelected(employee.id);
            return (
              <TableRow key={employee.id} data-state={isChecked ? "selected" : undefined}>
                <TableCell className="px-4">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => selection.toggle(employee.id)}
                    disabled={isOwner}
                    aria-label={`Выбрать ${employee.firstName} ${employee.lastName}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/employees/${employee.id}`}
                    className="focus-ring group flex items-center gap-3 rounded-sm"
                  >
                    <Avatar className="h-9 w-9">
                      {employee.avatarUrl ? (
                        <AvatarImage
                          src={employee.avatarUrl}
                          alt={`${employee.firstName} ${employee.lastName}`}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                        {employee.firstName.charAt(0)}
                        {employee.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-foreground group-hover:text-primary-600 truncate font-semibold">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">{employee.email}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {employee.position ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {employee.departmentName ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={employee.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/employees/${employee.id}`}
                    aria-label={`Открыть ${employee.firstName} ${employee.lastName}`}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <SelectionToolbar count={selection.count} onClear={selection.clear}>
        <Button
          size="sm"
          variant="success"
          leftIcon={<Power className="h-3.5 w-3.5" />}
          onClick={() => setPendingAction("ACTIVE")}
        >
          Активировать
        </Button>
        <Button
          size="sm"
          variant="danger"
          leftIcon={<PowerOff className="h-3.5 w-3.5" />}
          onClick={() => setPendingAction("SUSPENDED")}
        >
          Деактивировать
        </Button>
      </SelectionToolbar>

      <Dialog open={pendingAction !== null} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "ACTIVE"
                ? `Активировать ${selection.count} сотрудник(ов)?`
                : `Деактивировать ${selection.count} сотрудник(ов)?`}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "ACTIVE"
                ? "Сотрудники снова смогут заходить в систему."
                : "Сотрудники не смогут заходить в систему до следующей активации."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingAction(null)}
              leftIcon={<X className="h-4 w-4" />}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant={pendingAction === "ACTIVE" ? "success" : "danger"}
              loading={submitting}
              onClick={() => pendingAction && void applyBulk(pendingAction)}
            >
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="success" dot>
          Активен
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="warning" dot>
          Приглашён
        </Badge>
      );
    case "SUSPENDED":
      return <Badge variant="secondary">Деактивирован</Badge>;
    case "TERMINATED":
      return (
        <Badge variant="danger" dot>
          Уволен
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
