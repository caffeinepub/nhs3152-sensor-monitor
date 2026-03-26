import { ScrollArea } from "@/components/ui/scroll-area";
import type { SensorReading } from "../hooks/useSimulation";

interface EventLogProps {
  readings: SensorReading[];
  onExport: () => void;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EventLog({ readings, onExport }: EventLogProps) {
  const last100 = readings.slice(-100).reverse();

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{
        background: "oklch(0.16 0.008 240)",
        borderColor: "oklch(0.26 0.01 240)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold" style={{ color: "#F2F4F7" }}>
          Recent Event Log
        </span>
        <button
          type="button"
          onClick={onExport}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
          style={{
            background: "oklch(0.22 0.01 240)",
            borderColor: "oklch(0.30 0.01 240)",
            color: "#F2F4F7",
          }}
          data-ocid="log.export_button"
        >
          Export CSV
        </button>
      </div>

      {last100.length === 0 ? (
        <div
          className="flex items-center justify-center py-10 rounded-xl"
          style={{ background: "oklch(0.19 0.01 240)", color: "#6B7280" }}
          data-ocid="log.empty_state"
        >
          <span className="text-sm">No readings recorded yet</span>
        </div>
      ) : (
        <ScrollArea className="h-64">
          <table
            className="w-full text-xs"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.22 0.01 240)" }}>
                {["Time", "Temp (\u00b0C)", "pH", "Glucose (mg/dL)"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 font-semibold"
                      style={{ color: "#9AA3AE" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {last100.map((r, i) => (
                <tr
                  key={r.timestamp.toString()}
                  style={{ borderBottom: "1px solid oklch(0.19 0.01 240)" }}
                  data-ocid={`log.item.${i + 1}`}
                >
                  <td
                    className="py-1.5 px-3 font-mono"
                    style={{ color: "#9AA3AE" }}
                  >
                    {formatTimestamp(r.timestamp)}
                  </td>
                  <td
                    className="py-1.5 px-3 font-medium"
                    style={{ color: "#2DD4BF" }}
                  >
                    {r.temperature.toFixed(1)}
                  </td>
                  <td
                    className="py-1.5 px-3 font-medium"
                    style={{ color: "#3B82F6" }}
                  >
                    {r.pH.toFixed(2)}
                  </td>
                  <td
                    className="py-1.5 px-3 font-medium"
                    style={{ color: "#F59E0B" }}
                  >
                    {r.glucose.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </div>
  );
}
