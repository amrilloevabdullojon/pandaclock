"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@pandaclock/ui";

export function DecisionButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    setPending(action);
    try {
      await fetch(`/api/requests/${requestId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="success"
        disabled={pending !== null}
        onClick={() => act("approve")}
      >
        {pending === "approve" ? "..." : "✓ Утвердить"}
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending !== null}
        onClick={() => act("reject")}
      >
        {pending === "reject" ? "..." : "✕ Отклонить"}
      </Button>
    </div>
  );
}
