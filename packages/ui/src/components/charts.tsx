"use client";

/**
 * Chart-обёртки на Recharts в стиле дизайн-системы Pandaclock.
 *
 * Обёртки тонкие — рисуем только то, что нужно в проекте, с нашими
 * цветами/радиусами/типографикой. Recharts передаются через children
 * только в редких случаях, чаще — через props.
 */
import * as React from "react";
import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RLineChart,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../lib/utils";

interface TooltipPayloadEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

interface RechartsTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}

/* ────────────────────────────── tokens ────────────────────────────── */

export const CHART_COLORS = {
  primary: "#5B4FE2",
  primaryLight: "#8B7DFD",
  success: "#6BB39A",
  warning: "#F4A155",
  danger: "#ED7280",
  info: "#5B9FE6",
  gold: "#F4B942",
  muted: "#C5C9D6",
} as const;

export type ChartColor = keyof typeof CHART_COLORS;

const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "hsl(var(--foreground))",
  boxShadow: "0 4px 12px rgba(15, 16, 47, 0.08)",
};

function CompactTooltip(props: RechartsTooltipProps) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      {label !== undefined && (
        <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>{String(label)}</p>
      )}
      {payload.map((entry, idx) => (
        <p key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              background: String(entry.color ?? "currentColor"),
            }}
          />
          <span>{entry.name}</span>
          <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
            {entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ────────────────────────────── Sparkline ────────────────────────────── */

interface SparklineProps {
  data: { value: number }[];
  color?: ChartColor;
  height?: number;
  className?: string;
}

/** Маленький trend-график без осей — для KPI-карточек. */
export function Sparkline({ data, color = "primary", height = 40, className }: SparklineProps) {
  const stroke = CHART_COLORS[color];
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────────────────────── BarChart ────────────────────────────── */

interface BarChartProps {
  data: Record<string, string | number>[];
  /** Ключ для оси X. */
  xKey: string;
  /** Имена столбцов — массив либо строка. Каждому можно дать цвет. */
  bars: { key: string; name?: string; color?: ChartColor }[];
  height?: number;
  className?: string;
  hideAxis?: boolean;
  hideGrid?: boolean;
  /** Горизонтальная ориентация (layout="vertical"). */
  horizontal?: boolean;
  /** Если задано — нижняя ось X отображает только эти значения. */
  xTickFormatter?: (v: string) => string;
}

export function BarChart({
  data,
  xKey,
  bars,
  height = 240,
  className,
  hideAxis = false,
  hideGrid = false,
  horizontal = false,
  xTickFormatter,
}: BarChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 8, bottom: hideAxis ? 0 : 4, left: 0 }}
        >
          {!hideGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={horizontal}
              horizontal={!horizontal}
            />
          )}
          {!hideAxis && !horizontal && (
            <XAxis
              dataKey={xKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={xTickFormatter}
            />
          )}
          {!hideAxis && !horizontal && (
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
          )}
          {!hideAxis && horizontal && (
            <>
              <XAxis
                type="number"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
            </>
          )}
          <Tooltip content={<CompactTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          {bars.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.name ?? b.key}
              fill={CHART_COLORS[b.color ?? "primary"]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────────────────────── DonutChart ────────────────────────────── */

interface DonutChartProps {
  data: { name: string; value: number; color?: ChartColor }[];
  height?: number;
  className?: string;
  /** Большое число и подпись в центре. */
  centerLabel?: { value: string | number; description?: string };
  showLegend?: boolean;
}

export function DonutChart({
  data,
  height = 220,
  className,
  centerLabel,
  showLegend = true,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={cn("relative w-full", className)}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RPieChart>
            <Tooltip content={<CompactTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={3}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={CHART_COLORS[entry.color ?? "primary"]} />
              ))}
            </Pie>
          </RPieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            style={{ height }}
          >
            <div className="text-foreground text-3xl font-extrabold tabular-nums">
              {centerLabel.value}
            </div>
            {centerLabel.description && (
              <div className="text-muted-foreground text-xs">{centerLabel.description}</div>
            )}
          </div>
        )}
      </div>
      {showLegend && (
        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: CHART_COLORS[entry.color ?? "primary"] }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="text-foreground font-semibold tabular-nums">
                {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ────────────────────────────── TrendIndicator ────────────────────────────── */

interface TrendIndicatorProps {
  /** Изменение в процентах. Положительное = рост, отрицательное = падение. */
  value: number;
  /** Если true — рост = плохо (для метрик опозданий и т.д.). */
  inverse?: boolean;
  className?: string;
  /** Подпись справа (например, "vs прошлая неделя"). */
  label?: string;
}

export function TrendIndicator({ value, inverse, label, className }: TrendIndicatorProps) {
  const isUp = value > 0;
  const isDown = value < 0;
  const isGood = inverse ? isDown : isUp;
  const isBad = inverse ? isUp : isDown;
  const color =
    value === 0
      ? "text-muted-foreground"
      : isGood
        ? "text-success"
        : isBad
          ? "text-destructive"
          : "text-muted-foreground";
  const arrow = isUp ? "↑" : isDown ? "↓" : "→";
  const formatted = `${arrow} ${Math.abs(value).toFixed(0)}%`;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", color, className)}>
      {formatted}
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </span>
  );
}
