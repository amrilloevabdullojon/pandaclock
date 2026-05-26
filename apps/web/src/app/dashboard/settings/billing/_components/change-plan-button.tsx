"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pandaclock/ui";

type PlanCode = "STARTER" | "BUSINESS" | "PRO" | "ENTERPRISE";

export function ChangePlanButton({ plan }: { plan: PlanCode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change() {
    setPending(true);
    try {
      await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period: "MONTHLY" }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" fullWidth disabled={pending} onClick={change}>
      {pending ? "..." : "Выбрать"}
    </Button>
  );
}
