import { EVENT_META, EVENT_TYPES } from "./event-types";

export function CalendarLegend({ counts }: { counts: Record<keyof typeof EVENT_META, number> }) {
  return (
    <ul className="flex flex-wrap items-center gap-3">
      {EVENT_TYPES.map((type) => {
        const meta = EVENT_META[type];
        const count = counts[type];
        return (
          <li
            key={type}
            className="text-muted-foreground flex items-center gap-1.5 text-xs"
            title={`${meta.label}: ${count}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
            <span>{meta.label}</span>
            <span className="tabular-nums">({count})</span>
          </li>
        );
      })}
    </ul>
  );
}
