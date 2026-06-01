"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, X, XCircle } from "lucide-react";
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
  Input,
  SelectionToolbar,
  toast,
  useRowSelection,
} from "@pandaclock/ui";
import { DecisionButtons } from "./decision-buttons";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type LeaveType = "VACATION" | "SICK" | "TIME_OFF" | "OTHER";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: Status;
  approverName: string | null;
  approverComment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface Props {
  items: LeaveRequest[];
  scope: "my" | "team" | "all";
}

const TYPE_META: Record<LeaveType, { icon: string; label: string }> = {
  VACATION: { icon: "✈️", label: "Отпуск" },
  SICK: { icon: "🤒", label: "Больничный" },
  TIME_OFF: { icon: "🎂", label: "Отгул" },
  OTHER: { icon: "📝", label: "Другое" },
};

const STATUS_META: Record<
  Status,
  { variant: "warning" | "success" | "danger" | "secondary"; label: string }
> = {
  PENDING: { variant: "warning", label: "Ждёт решения" },
  APPROVED: { variant: "success", label: "Утверждена" },
  REJECTED: { variant: "danger", label: "Отклонена" },
  CANCELLED: { variant: "secondary", label: "Отменена" },
};

export function RequestsList({ items, scope }: Props) {
  const router = useRouter();
  const selection = useRowSelection<string>();
  const canDecide = scope === "team" || scope === "all";

  const selectableIds = React.useMemo(
    () => (canDecide ? items.filter((r) => r.status === "PENDING").map((r) => r.id) : []),
    [items, canDecide],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selection.isSelected(id));
  const someSelected = selection.count > 0 && !allSelected;

  const [pendingAction, setPendingAction] = React.useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function applyBulk(action: "approve" | "reject") {
    setSubmitting(true);
    try {
      const ids = Array.from(selection.selected);
      const response = await fetch(`/api/requests/bulk/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, comment: comment.trim() || undefined }),
      });
      if (!response.ok) {
        toast.error("Не удалось применить");
        return;
      }
      const data = (await response.json()) as { updated: number };
      toast.success(
        action === "approve" ? `Утверждено: ${data.updated}` : `Отклонено: ${data.updated}`,
      );
      selection.clear();
      setComment("");
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
      {canDecide && selectableIds.length > 0 && (
        <div className="border-border flex items-center gap-3 border-b px-6 py-2">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={() => selection.selectAll(selectableIds)}
            aria-label="Выбрать все ожидающие"
          />
          <span className="text-muted-foreground text-xs">
            Выбрать все ожидающие ({selectableIds.length})
          </span>
        </div>
      )}

      <ul className="divide-border divide-y">
        {items.map((req) => {
          const isCheckable = canDecide && req.status === "PENDING";
          const isChecked = selection.isSelected(req.id);
          const typeInfo = TYPE_META[req.type];

          return (
            <li
              key={req.id}
              data-state={isChecked ? "selected" : undefined}
              className={`hover:bg-muted/40 flex items-start gap-4 px-6 py-4 transition-colors ${
                isChecked ? "bg-accent/30" : ""
              }`}
            >
              {isCheckable ? (
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => selection.toggle(req.id)}
                  aria-label={`Выбрать заявку ${req.userName}`}
                  className="mt-3"
                />
              ) : (
                <div className="w-4 shrink-0" aria-hidden="true" />
              )}

              <div className="flex flex-1 items-start gap-3">
                <Avatar className="mt-0.5 h-9 w-9">
                  {req.userAvatarUrl ? (
                    <AvatarImage src={req.userAvatarUrl} alt={req.userName} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-primary text-xs font-bold text-white">
                    {initialsOf(req.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground text-sm font-bold">{req.userName}</span>
                    <Badge variant="outline" className="gap-1">
                      <span aria-hidden="true">{typeInfo.icon}</span>
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(req.startDate)} — {formatDate(req.endDate)} ·{" "}
                    <span className="text-foreground font-semibold">{req.daysCount}</span> раб.{" "}
                    {pluralizeDays(req.daysCount)}
                  </p>
                  {req.reason && (
                    <p className="text-muted-foreground text-sm leading-snug">{req.reason}</p>
                  )}
                  {req.approverComment && (
                    <p className="text-muted-foreground text-xs italic">
                      <span className="font-semibold not-italic">{req.approverName}:</span>{" "}
                      {req.approverComment}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={STATUS_META[req.status].variant} dot>
                  {STATUS_META[req.status].label}
                </Badge>
                {req.status === "PENDING" && canDecide ? (
                  <DecisionButtons requestId={req.id} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <SelectionToolbar count={selection.count} onClear={selection.clear}>
        <Button
          size="sm"
          variant="success"
          leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
          onClick={() => {
            setComment("");
            setPendingAction("approve");
          }}
        >
          Утвердить все
        </Button>
        <Button
          size="sm"
          variant="danger"
          leftIcon={<XCircle className="h-3.5 w-3.5" />}
          onClick={() => {
            setComment("");
            setPendingAction("reject");
          }}
        >
          Отклонить все
        </Button>
      </SelectionToolbar>

      <Dialog open={pendingAction !== null} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "approve"
                ? `Утвердить ${selection.count} заявку(и)?`
                : `Отклонить ${selection.count} заявку(и)?`}
            </DialogTitle>
            <DialogDescription>
              Решение получит каждый автор заявки. Можете оставить комментарий — он попадёт в
              карточку заявки.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label htmlFor="bulk-comment" className="text-foreground text-sm font-semibold">
              Комментарий (опционально)
            </label>
            <Input
              id="bulk-comment"
              placeholder="Например, причина или пожелание"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

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
              variant={pendingAction === "approve" ? "success" : "danger"}
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

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function pluralizeDays(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "дней";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}
