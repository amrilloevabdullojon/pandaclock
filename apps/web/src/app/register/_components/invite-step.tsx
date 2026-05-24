"use client";

import { useState } from "react";
import { Button, Input } from "@pandaclock/ui";

export function InviteStep({
  onBack,
  onSkip,
  onSubmit,
}: {
  onBack: () => void;
  onSkip: () => Promise<void>;
  onSubmit: (emails: string[]) => Promise<void>;
}) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  function updateEmail(idx: number, value: string) {
    setEmails((current) => current.map((email, i) => (i === idx ? value : email)));
  }

  function addRow() {
    setEmails((current) => [...current, ""]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const clean = emails.map((email) => email.trim()).filter(Boolean);
      await onSubmit(clean);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    setSubmitting(true);
    try {
      await onSkip();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-neutral-900">
          Пригласите команду (можно потом)
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Сотрудники получат приглашение присоединиться к Pandaclock.
        </p>
      </header>

      <div className="space-y-2">
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
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          + Ещё один email
        </Button>
      </div>

      <p className="text-xs text-neutral-400">
        💡 Импорт большой команды из Excel будет доступен после регистрации.
      </p>

      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="secondary" onClick={onBack} disabled={submitting}>
          ← Назад
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={handleSkip} disabled={submitting}>
            Пропустить
          </Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "..." : "Завершить регистрацию"}
          </Button>
        </div>
      </div>
    </form>
  );
}
