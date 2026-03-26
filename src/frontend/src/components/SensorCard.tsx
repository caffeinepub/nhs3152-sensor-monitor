import { MoreVertical } from "lucide-react";
import { useState } from "react";

export type MetricType = "temperature" | "ph" | "glucose";
export type StatusLevel = "normal" | "warning" | "alert";

interface SensorCardProps {
  metric: MetricType;
  value: number | null;
  minValue: number | null;
  maxValue: number | null;
}

const CONFIG = {
  temperature: {
    label: "Temperature",
    accent: "#2DD4BF",
    accentMuted: "rgba(45,212,191,0.15)",
    accentBorder: "rgba(45,212,191,0.3)",
    units: ["\u00b0C", "\u00b0F"] as const,
    convert: (v: number, u: string) =>
      u === "\u00b0F" ? Math.round((v * 9) / 5 + 32) : v,
    formatValue: (v: number, _u: string) => v.toFixed(1),
    rangeLow: 0,
    rangeHigh: 120,
    getStatus: (v: number): StatusLevel => {
      if (v < 35.0 || v > 38.0) return "alert";
      if (v < 36.1 || v > 37.2) return "warning";
      return "normal";
    },
  },
  ph: {
    label: "pH Level",
    accent: "#3B82F6",
    accentMuted: "rgba(59,130,246,0.15)",
    accentBorder: "rgba(59,130,246,0.3)",
    units: ["pH"] as const,
    convert: (v: number, _u: string) => v,
    formatValue: (v: number, _u: string) => v.toFixed(2),
    rangeLow: 1,
    rangeHigh: 12,
    getStatus: (v: number): StatusLevel => {
      if (v < 7.2 || v > 7.55) return "alert";
      if (v < 7.35 || v > 7.45) return "warning";
      return "normal";
    },
  },
  glucose: {
    label: "Glucose Level",
    accent: "#F59E0B",
    accentMuted: "rgba(245,158,11,0.15)",
    accentBorder: "rgba(245,158,11,0.3)",
    units: ["mg/dL", "mmol/L"] as const,
    convert: (v: number, u: string) =>
      u === "mmol/L" ? Math.round((v / 18.0) * 10) / 10 : v,
    formatValue: (v: number, u: string) =>
      u === "mmol/L" ? v.toFixed(1) : v.toFixed(0),
    rangeLow: 50,
    rangeHigh: 300,
    getStatus: (v: number): StatusLevel => {
      if (v < 55 || v > 240) return "alert";
      if (v < 70 || v > 180) return "warning";
      return "normal";
    },
  },
};

const STATUS_COLORS: Record<
  StatusLevel,
  { bg: string; text: string; border: string }
> = {
  normal: {
    bg: "rgba(34,197,94,0.15)",
    text: "#22C55E",
    border: "rgba(34,197,94,0.3)",
  },
  warning: {
    bg: "rgba(251,191,36,0.15)",
    text: "#FBBF24",
    border: "rgba(251,191,36,0.3)",
  },
  alert: {
    bg: "rgba(239,68,68,0.15)",
    text: "#EF4444",
    border: "rgba(239,68,68,0.3)",
  },
};

export function SensorCard({
  metric,
  value,
  minValue,
  maxValue,
}: SensorCardProps) {
  const config = CONFIG[metric];
  const [unitIdx, setUnitIdx] = useState(0);
  const unit = config.units[unitIdx];

  const displayValue = value !== null ? config.convert(value, unit) : null;
  const displayMin = minValue !== null ? config.convert(minValue, unit) : null;
  const displayMax = maxValue !== null ? config.convert(maxValue, unit) : null;
  const status: StatusLevel =
    value !== null ? config.getStatus(value) : "normal";
  const statusColors = STATUS_COLORS[status];

  const rangePercent =
    value !== null
      ? Math.max(
          0,
          Math.min(
            100,
            ((value - config.rangeLow) / (config.rangeHigh - config.rangeLow)) *
              100,
          ),
        )
      : 0;

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{
        background: "oklch(0.16 0.008 240)",
        borderColor: config.accentBorder,
        boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 20px ${config.accentMuted}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-base font-semibold"
          style={{ color: config.accent }}
        >
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          {config.units.length > 1 && (
            <button
              type="button"
              onClick={() => setUnitIdx((i) => (i + 1) % config.units.length)}
              className="text-xs font-medium px-2 py-0.5 rounded-full border transition-colors hover:opacity-80"
              style={{
                borderColor: config.accentBorder,
                color: config.accent,
                background: config.accentMuted,
              }}
              data-ocid={`${metric}.toggle`}
            >
              {unit}
            </button>
          )}
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Big value */}
      {displayValue !== null ? (
        <div className="flex items-baseline gap-2">
          <span
            className="font-extrabold leading-none"
            style={{ fontSize: "3.2rem", color: "#F2F4F7" }}
          >
            {config.formatValue(displayValue, unit)}
          </span>
          <span className="text-xl font-medium" style={{ color: "#9AA3AE" }}>
            {unit}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <span
            className="font-extrabold leading-none"
            style={{ fontSize: "3.2rem", color: "#6B7280" }}
          >
            &mdash;
          </span>
          <span className="text-xl font-medium" style={{ color: "#6B7280" }}>
            {unit}
          </span>
        </div>
      )}

      {/* Status pill */}
      <div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{
            background: statusColors.bg,
            color: statusColors.text,
            border: `1px solid ${statusColors.border}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse2"
            style={{ background: statusColors.text }}
          />
          {value !== null ? status : "no data"}
        </span>
      </div>

      {/* Range bar */}
      <div className="space-y-1">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "oklch(0.22 0.01 240)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${rangePercent}%`, background: config.accent }}
          />
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: "#6B7280" }}
        >
          <span>
            Low: {config.rangeLow}
            {metric === "glucose"
              ? " mg/dL"
              : metric === "temperature"
                ? "\u00b0C"
                : ""}
          </span>
          <span>
            High: {config.rangeHigh}
            {metric === "glucose"
              ? " mg/dL"
              : metric === "temperature"
                ? "\u00b0C"
                : ""}
          </span>
        </div>
      </div>

      {/* Min / Max */}
      <div
        className="flex gap-4 pt-1 border-t"
        style={{ borderColor: "oklch(0.22 0.01 240)" }}
      >
        <div>
          <div className="text-xs" style={{ color: "#6B7280" }}>
            Min
          </div>
          <div className="text-sm font-semibold" style={{ color: "#9AA3AE" }}>
            {displayMin !== null
              ? `${config.formatValue(displayMin, unit)} ${unit}`
              : "\u2014"}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: "#6B7280" }}>
            Max
          </div>
          <div className="text-sm font-semibold" style={{ color: "#9AA3AE" }}>
            {displayMax !== null
              ? `${config.formatValue(displayMax, unit)} ${unit}`
              : "\u2014"}
          </div>
        </div>
      </div>
    </div>
  );
}
