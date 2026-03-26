import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SensorReading } from "../hooks/useSimulation";
import type { MetricType } from "./SensorCard";

interface SensorChartProps {
  metric: MetricType;
  readings: SensorReading[];
}

const CONFIG = {
  temperature: {
    label: "Temperature (\u00b0C)",
    accent: "#2DD4BF",
    key: "temperature" as keyof SensorReading,
    yDomain: [0, 120] as [number, number],
    gradientId: "tempGrad",
  },
  ph: {
    label: "pH Level",
    accent: "#3B82F6",
    key: "pH" as keyof SensorReading,
    yDomain: [1, 12] as [number, number],
    gradientId: "phGrad",
  },
  glucose: {
    label: "Glucose (mg/dL)",
    accent: "#F59E0B",
    key: "glucose" as keyof SensorReading,
    yDomain: [50, 300] as [number, number],
    gradientId: "glucoseGrad",
  },
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export function SensorChart({ metric, readings }: SensorChartProps) {
  const config = CONFIG[metric];
  const last50 = readings.slice(-50);

  const data = last50.map((r) => {
    const ms = Number(r.timestamp / 1_000_000n);
    return {
      ms,
      time: formatTime(ms),
      value:
        typeof r[config.key] === "bigint"
          ? Number(r[config.key])
          : (r[config.key] as number),
    };
  });

  return (
    <div
      className="rounded-2xl border p-5 h-full"
      style={{
        background: "oklch(0.16 0.008 240)",
        borderColor: "oklch(0.26 0.01 240)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        minHeight: 220,
      }}
    >
      <div className="mb-3">
        <span
          className="text-base font-semibold"
          style={{ color: config.accent }}
        >
          {config.label}
        </span>
      </div>
      {data.length === 0 ? (
        <div
          className="flex items-center justify-center h-40"
          style={{ color: "#6B7280" }}
        >
          <span className="text-sm">Awaiting sensor data...</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={config.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={config.accent}
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor={config.accent}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis
              dataKey="ms"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ms) => formatTime(ms as number)}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={config.yDomain}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              labelFormatter={(ms) => formatTime(ms as number)}
              contentStyle={{
                background: "oklch(0.19 0.01 240)",
                border: "1px solid oklch(0.26 0.01 240)",
                borderRadius: "8px",
                color: "#F2F4F7",
                fontSize: 12,
              }}
              labelStyle={{ color: "#9AA3AE" }}
              cursor={{
                stroke: config.accent,
                strokeWidth: 1,
                strokeDasharray: "4 2",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.accent}
              strokeWidth={2}
              fill={`url(#${config.gradientId})`}
              dot={false}
              activeDot={{
                fill: config.accent,
                r: 5,
                stroke: "rgba(255,255,255,0.2)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
