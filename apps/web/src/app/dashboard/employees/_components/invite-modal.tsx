"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@pandaclock/ui";

export function InviteEmployees() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ invited: number; skipped: number } | null>(null);

  function updateEmail(idx: number, value: string) {
    setEmails((current) => current.map((email, i) => (i === idx ? value : email)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const clean = emails.map((email) => email.trim()).filter(Boolean);
      if (clean.length === 0) {
        setError("Введите минимум один email");
        return;
      }
      const response = await fetch("/api/employees/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitees: clean.map((email) => ({ email })) }),
      });
      if (!response.ok) {
        setError("Не удалось отправить приглашения");
        return;
      }
      const body = (await response.json()) as { invited: string[]; skipped: unknown[] };
      setSummary({ invited: body.invited.length, skipped: body.skipped.length });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Пригласить</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пригласить сотрудников</DialogTitle>
          <DialogDescription>
            Каждый сотрудник получит email со ссылкой для регистрации.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="rounded-md bg-success-light p-4 text-sm text-success">
            ✓ Приглашено: {summary.invited}. Пропущено: {summary.skipped}.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {emails.map((email, idx) => (
            <Input
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              type="email"
              placeholder="colleague@company.uz"
              value={email}
              onChange={(e) => updateEmail(idx, e.target.value)}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEmails((cur) => [...cur, ""])}
          >
            + Ещё один email
          </Button>

          {error ? (
            <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "..." : "Отправить приглашения"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
