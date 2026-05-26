"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const OPTIONS = [
  { value: "ru", label: "🇷🇺 RU" },
  { value: "uz-latn", label: "🇺🇿 O'z" },
  { value: "en", label: "🇬🇧 EN" },
];

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    setValue(next);
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      disabled={pending}
      className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
