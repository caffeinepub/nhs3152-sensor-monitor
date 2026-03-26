import { Toaster } from "@/components/ui/sonner";
import {
  Activity,
  Download,
  Moon,
  RefreshCw,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EventLog } from "./components/EventLog";
import { SensorCard } from "./components/SensorCard";
import { SensorChart } from "./components/SensorChart";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { useNFC } from "./hooks/useNFC";
import { useAddReading, useGetReadings } from "./hooks/useQueries";
import { useSimulation } from "./hooks/useSimulation";
import type { SensorReading } from "./hooks/useSimulation";

function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [localReadings, setLocalReadings] = useState<SensorReading[]>([]);
  // Simulation is NEVER auto-enabled. User must explicitly turn it on.
  const [simulationMode, setSimulationMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: backendReadings } = useGetReadings();
  const addReading = useAddReading();
  const addReadingRef = useRef(addReading);
  addReadingRef.current = addReading;

  const allReadings = useMemo(() => {
    const backendSet = new Set(
      backendReadings?.map((r) => r.timestamp.toString()) ?? [],
    );
    const localNew = localReadings.filter(
      (r) => !backendSet.has(r.timestamp.toString()),
    );
    return [...(backendReadings ?? []), ...localNew].sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : 1,
    );
  }, [backendReadings, localReadings]);

  const handleNewReading = useRef((r: SensorReading) => {
    setLocalReadings((prev) => [...prev.slice(-200), r]);
    addReadingRef.current.mutate(r);
  }).current;

  const nfc = useNFC(handleNewReading);

  // Simulation only runs when explicitly enabled by the user AND NFC is not actively scanning
  useSimulation(simulationMode && !nfc.isScanning, handleNewReading);

  // When NFC scan starts with real data coming in, turn off simulation automatically
  useEffect(() => {
    if (nfc.isScanning) {
      setSimulationMode(false);
    }
  }, [nfc.isScanning]);

  // Clear readings when switching modes so old simulated data doesn't pollute real readings
  const prevSimRef = useRef(simulationMode);
  useEffect(() => {
    if (prevSimRef.current !== simulationMode) {
      setLocalReadings([]);
      prevSimRef.current = simulationMode;
    }
  }, [simulationMode]);

  function exportCSV() {
    if (allReadings.length === 0) {
      toast.error("No readings to export");
      return;
    }
    const csvContent = [
      "Timestamp,Temperature (\u00b0C),pH,Glucose (mg/dL)",
      ...allReadings.map(
        (r) =>
          `${new Date(Number(r.timestamp) / 1_000_000).toISOString()},${r.temperature},${r.pH},${r.glucose}`,
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biomonitor_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allReadings.length} readings`);
  }

  const stats = useMemo(() => {
    if (allReadings.length === 0)
      return {
        temp: null,
        ph: null,
        glucose: null,
        minTemp: null,
        maxTemp: null,
        minPH: null,
        maxPH: null,
        minGlucose: null,
        maxGlucose: null,
      };
    const temps = allReadings.map((r) => r.temperature);
    const phs = allReadings.map((r) => r.pH);
    const glucoses = allReadings.map((r) => r.glucose);
    const last = allReadings[allReadings.length - 1];
    return {
      temp: last.temperature,
      ph: last.pH,
      glucose: last.glucose,
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      minPH: Math.min(...phs),
      maxPH: Math.max(...phs),
      minGlucose: Math.min(...glucoses),
      maxGlucose: Math.max(...glucoses),
    };
  }, [allReadings]);

  const isConnected = nfc.nfcAvailable && nfc.isScanning;
  const isDark = theme === "dark";

  // Determine what idle state to show
  const showIdleState =
    !simulationMode && !nfc.isScanning && allReadings.length === 0;

  const NAV_TABS = [
    { id: "dashboard", label: "Patient Dashboard" },
    { id: "device", label: "Device Settings" },
    { id: "analytics", label: "Analytics" },
    { id: "reports", label: "Reports" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0B0D10 0%, #0F1115 100%)"
          : "linear-gradient(135deg, #f0f4f8 0%, #e8edf3 100%)",
      }}
    >
      {/* Simulation mode banner */}
      {simulationMode && (
        <div
          className="w-full text-center text-xs font-semibold py-2 px-4"
          style={{
            background: "rgba(251,191,36,0.15)",
            color: "#FBBF24",
            borderBottom: "1px solid rgba(251,191,36,0.25)",
          }}
          data-ocid="app.toast"
        >
          &#9888; SIMULATION MODE &mdash; Data shown is synthetic. Not from a
          real NHS3152 chip.
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
        {/* HEADER */}
        <header
          className="rounded-2xl border px-6 py-3 flex items-center justify-between gap-4"
          style={{
            background: isDark ? "oklch(0.16 0.008 240)" : "white",
            borderColor: isDark ? "oklch(0.26 0.01 240)" : "#e2e8f0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #2DD4BF, #3B82F6)",
              }}
            >
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span
              className="font-extrabold tracking-widest text-sm uppercase"
              style={{
                color: isDark ? "#F2F4F7" : "#1a202c",
                letterSpacing: "0.15em",
              }}
            >
              BIOMONITOR
            </span>
          </div>

          {/* Nav tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background:
                    activeTab === tab.id
                      ? isDark
                        ? "oklch(0.22 0.01 240)"
                        : "#eef2f7"
                      : "transparent",
                  color:
                    activeTab === tab.id
                      ? "#2DD4BF"
                      : isDark
                        ? "#9AA3AE"
                        : "#64748b",
                }}
                data-ocid={`nav.${tab.id}.tab`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-1.5"
              style={{
                background: isDark ? "oklch(0.19 0.01 240)" : "#f1f5f9",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#6B7280" }}
              />
              <span
                className="text-xs hidden sm:block"
                style={{ color: isDark ? "#9AA3AE" : "#64748b" }}
              >
                Sarah Jenkins
              </span>
              <span
                className="text-xs hidden sm:block"
                style={{ color: isDark ? "#6B7280" : "#94a3b8" }}
              >
                Clinician
              </span>
            </div>
          </div>
        </header>

        {/* PAGE TITLE ROW */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1
              className="font-extrabold leading-tight"
              style={{
                fontSize: "2rem",
                color: isDark ? "#F2F4F7" : "#1a202c",
              }}
            >
              Real-Time Sensor Monitoring
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: isDark ? "#9AA3AE" : "#64748b" }}
            >
              Patient:{" "}
              <span style={{ color: isDark ? "#F2F4F7" : "#1a202c" }}>
                John Doe
              </span>
              &nbsp;|&nbsp; NFC ID:{" "}
              <span style={{ color: isDark ? "#F2F4F7" : "#1a202c" }}>
                NHS-3152-A4F2
              </span>
              &nbsp;|&nbsp;
              <span
                style={{
                  color: isConnected
                    ? "#22C55E"
                    : simulationMode
                      ? "#FBBF24"
                      : "#6B7280",
                }}
                className="font-semibold"
              >
                &#9679;{" "}
                {isConnected ? "Live" : simulationMode ? "Simulation" : "Idle"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* NFC Status */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
              style={{
                background: isConnected
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(107,114,128,0.12)",
                borderColor: isConnected
                  ? "rgba(34,197,94,0.3)"
                  : "rgba(107,114,128,0.3)",
                color: isConnected ? "#86EFAC" : isDark ? "#9AA3AE" : "#64748b",
              }}
              data-ocid="nfc.loading_state"
            >
              {isConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              NFC:{" "}
              {isConnected
                ? "Connected"
                : nfc.nfcAvailable
                  ? "Ready"
                  : "Unavailable"}
            </div>

            {/* NFC scan toggle - only show when NFC is supported */}
            {nfc.nfcAvailable && (
              <button
                type="button"
                onClick={() =>
                  nfc.isScanning ? nfc.stopScan() : nfc.startScan()
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:opacity-80"
                style={{
                  background: nfc.isScanning
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(45,212,191,0.12)",
                  borderColor: nfc.isScanning
                    ? "rgba(239,68,68,0.3)"
                    : "rgba(45,212,191,0.3)",
                  color: nfc.isScanning ? "#EF4444" : "#2DD4BF",
                }}
                data-ocid="nfc.toggle"
              >
                {nfc.isScanning ? "Stop Scan" : "Start NFC Scan"}
              </button>
            )}

            {/* Simulation toggle - always available as explicit opt-in */}
            <button
              type="button"
              onClick={() => {
                if (nfc.isScanning) nfc.stopScan();
                setSimulationMode((s) => !s);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:opacity-80"
              style={{
                background: simulationMode
                  ? "rgba(251,191,36,0.12)"
                  : "rgba(107,114,128,0.12)",
                borderColor: simulationMode
                  ? "rgba(251,191,36,0.3)"
                  : "rgba(107,114,128,0.3)",
                color: simulationMode
                  ? "#FBBF24"
                  : isDark
                    ? "#9AA3AE"
                    : "#64748b",
              }}
              data-ocid="simulation.toggle"
            >
              <RefreshCw className="w-3 h-3" />
              {simulationMode ? "Stop Simulation" : "Demo Mode"}
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: isDark ? "oklch(0.22 0.01 240)" : "#f1f5f9",
                borderColor: isDark ? "oklch(0.30 0.01 240)" : "#e2e8f0",
                color: isDark ? "#9AA3AE" : "#64748b",
              }}
              data-ocid="theme.toggle"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              {isDark ? "Light" : "Dark"}
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all hover:opacity-80"
              style={{
                background: isDark ? "oklch(0.22 0.01 240)" : "#1e293b",
                borderColor: isDark ? "oklch(0.35 0.01 240)" : "#334155",
                color: isDark ? "#F2F4F7" : "white",
              }}
              data-ocid="export.button"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            {/* Sync status */}
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{
                color: isConnected
                  ? "#22C55E"
                  : simulationMode
                    ? "#FBBF24"
                    : "#6B7280",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isConnected
                    ? "#22C55E"
                    : simulationMode
                      ? "#FBBF24"
                      : "#6B7280",
                  animation:
                    isConnected || simulationMode
                      ? "pulse 2s infinite"
                      : "none",
                }}
              />
              {isConnected ? "Live" : simulationMode ? "Simulation" : "No Data"}
            </div>
          </div>
        </div>

        {/* IDLE / NO CHIP STATE */}
        {showIdleState && (
          <div
            className="rounded-2xl border p-12 flex flex-col items-center gap-5 text-center"
            style={{
              background: isDark ? "oklch(0.16 0.008 240)" : "white",
              borderColor: isDark ? "oklch(0.26 0.01 240)" : "#e2e8f0",
            }}
            data-ocid="nfc.error_state"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(107,114,128,0.15)" }}
            >
              <WifiOff className="w-8 h-8" style={{ color: "#6B7280" }} />
            </div>
            <div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: isDark ? "#F2F4F7" : "#1a202c" }}
              >
                No NHS3152 Chip Connected
              </h2>
              <p
                className="text-sm max-w-md"
                style={{ color: isDark ? "#9AA3AE" : "#64748b" }}
              >
                {nfc.nfcAvailable
                  ? 'NFC is supported. Tap "Start NFC Scan" above, then hold the NHS3152 chip near your device to begin reading real sensor data.'
                  : "Web NFC is not available in this browser. Use Chrome on Android for live NHS3152 data. You can also use Demo Mode to explore the interface with synthetic data."}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {nfc.nfcAvailable && (
                <button
                  type="button"
                  onClick={() => nfc.startScan()}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{
                    background: "linear-gradient(135deg, #2DD4BF, #3B82F6)",
                    color: "white",
                  }}
                  data-ocid="nfc.primary_button"
                >
                  Start NFC Scan
                </button>
              )}
              <button
                type="button"
                onClick={() => setSimulationMode(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
                style={{
                  background: "transparent",
                  borderColor: "rgba(251,191,36,0.4)",
                  color: "#FBBF24",
                }}
                data-ocid="simulation.primary_button"
              >
                Demo Mode (Simulated Data)
              </button>
            </div>
          </div>
        )}

        {/* MAIN GRID - only shown when there is real data or simulation is explicitly on */}
        {(simulationMode || nfc.isScanning || allReadings.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
            {/* LEFT: Metric cards */}
            <div className="flex flex-col gap-5">
              <SensorCard
                metric="temperature"
                value={stats.temp}
                minValue={stats.minTemp}
                maxValue={stats.maxTemp}
              />
              <SensorCard
                metric="ph"
                value={stats.ph}
                minValue={stats.minPH}
                maxValue={stats.maxPH}
              />
              <SensorCard
                metric="glucose"
                value={stats.glucose}
                minValue={stats.minGlucose}
                maxValue={stats.maxGlucose}
              />
            </div>

            {/* RIGHT: Charts */}
            <div className="flex flex-col gap-5">
              <SensorChart metric="temperature" readings={allReadings} />
              <SensorChart metric="ph" readings={allReadings} />
              <SensorChart metric="glucose" readings={allReadings} />
            </div>
          </div>
        )}

        {/* BOTTOM: Event log */}
        {allReadings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EventLog readings={allReadings} onExport={exportCSV} />
            {/* Details panel */}
            <div
              className="rounded-2xl border p-5"
              style={{
                background: isDark ? "oklch(0.16 0.008 240)" : "white",
                borderColor: isDark ? "oklch(0.26 0.01 240)" : "#e2e8f0",
                boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
              }}
            >
              <h3
                className="text-base font-semibold mb-4"
                style={{ color: isDark ? "#F2F4F7" : "#1a202c" }}
              >
                Session Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Total Readings",
                    value: allReadings.length.toString(),
                    color: "#F2F4F7",
                  },
                  {
                    label: "Session Duration",
                    value:
                      allReadings.length > 1
                        ? `${Math.round(
                            Number(
                              allReadings[allReadings.length - 1].timestamp -
                                allReadings[0].timestamp,
                            ) /
                              1_000_000_000 /
                              60,
                          )} min`
                        : "< 1 min",
                    color: "#F2F4F7",
                  },
                  {
                    label: "Avg Temperature",
                    value:
                      allReadings.length > 0
                        ? `${(allReadings.reduce((s, r) => s + r.temperature, 0) / allReadings.length).toFixed(1)} \u00b0C`
                        : "\u2014",
                    color: "#2DD4BF",
                  },
                  {
                    label: "Avg pH",
                    value:
                      allReadings.length > 0
                        ? (
                            allReadings.reduce((s, r) => s + r.pH, 0) /
                            allReadings.length
                          ).toFixed(2)
                        : "\u2014",
                    color: "#3B82F6",
                  },
                  {
                    label: "Avg Glucose",
                    value:
                      allReadings.length > 0
                        ? `${(allReadings.reduce((s, r) => s + r.glucose, 0) / allReadings.length).toFixed(0)} mg/dL`
                        : "\u2014",
                    color: "#F59E0B",
                  },
                  {
                    label: "Data Source",
                    value: simulationMode
                      ? "Simulation"
                      : nfc.isScanning
                        ? "NHS3152 Live"
                        : "Idle",
                    color: simulationMode ? "#FBBF24" : "#22C55E",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3"
                    style={{
                      background: isDark ? "oklch(0.19 0.01 240)" : "#f8fafc",
                    }}
                  >
                    <div
                      className="text-xs mb-1"
                      style={{ color: isDark ? "#6B7280" : "#94a3b8" }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer
          className="rounded-2xl border px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{
            background: isDark ? "oklch(0.16 0.008 240)" : "white",
            borderColor: isDark ? "oklch(0.26 0.01 240)" : "#e2e8f0",
            color: isDark ? "#6B7280" : "#94a3b8",
          }}
        >
          <span className="font-semibold tracking-wider uppercase">
            NHS3152 MONITOR &copy; {new Date().getFullYear()}
          </span>
          <div className="flex items-center gap-4">
            <span style={{ color: isDark ? "#9AA3AE" : "#64748b" }}>
              Documentation
            </span>
            <span style={{ color: isDark ? "#9AA3AE" : "#64748b" }}>
              Privacy
            </span>
            <span style={{ color: isDark ? "#9AA3AE" : "#64748b" }}>
              Support
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: isConnected
                  ? "#22C55E"
                  : simulationMode
                    ? "#FBBF24"
                    : "#6B7280",
              }}
            />
            Connection Status:{" "}
            {isConnected
              ? "NFC Live"
              : simulationMode
                ? "Simulation"
                : "No Chip"}
          </div>
        </footer>

        {/* Caffeine attribution */}
        <p
          className="text-center text-xs"
          style={{ color: isDark ? "#4B5563" : "#94a3b8" }}
        >
          &copy; {new Date().getFullYear()}. Built with &#x2764;&#xfe0f; using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2DD4BF" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
