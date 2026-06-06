"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@pandaclock/ui";

export function ReportControls({
  type,
  period,
  exportable = true,
}: {
  type: "attendance" | "hours" | "tasks" | "overview";
  period: { startIso: string; endIso: string };
  /** Показывать кнопки выгрузки Excel/PDF (overview не экспортируется). */
  exportable?: boolean;
}) {
  const router = useRouter();
  const [start, setStart] = useState(period.startIso);
  const [end, setEnd] = useState(period.endIso);

  function applyPeriod() {
    const qs = new URLSearchParams({ type, start, end });
    router.push(`/dashboard/reports?${qs.toString()}`);
    router.refresh();
  }

  function download(format: "xlsx" | "pdf") {
    const qs = new URLSearchParams({ format, start, end });
    window.open(`/api/reports/${type}/export?${qs.toString()}`, "_blank");
  }

  return (
    <div className="border-border bg-card flex flex-wrap items-end gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Начало
        </label>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Конец
        </label>
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Button onClick={applyPeriod}>Применить</Button>
      {exportable ? (
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => download("xlsx")}>
            📥 Excel
          </Button>
          <Button variant="secondary" onClick={() => download("pdf")}>
            📄 PDF
          </Button>
        </div>
      ) : null}
    </div>
  );
}
