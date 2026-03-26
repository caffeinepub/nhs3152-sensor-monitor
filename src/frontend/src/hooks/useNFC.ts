import { useCallback, useRef, useState } from "react";
import type { SensorReading } from "./useSimulation";

export interface UseNFCReturn {
  nfcAvailable: boolean;
  isScanning: boolean;
  startScan: () => Promise<void>;
  stopScan: () => void;
  lastReading: SensorReading | null;
  error: string | null;
}

// ─── NHS3152 ADC conversion helpers ────────────────────────────────────────
function adcToTemperature(raw: number): number {
  const millivolts = (raw / 4096) * 1200;
  const celsius = (millivolts - 600) / 1.77;
  return Math.min(120, Math.max(0, Math.round(celsius * 10) / 10));
}

// APIO Ch0 → pH: map 12-bit ADC range to pH 1–12
function adcToPH(raw: number): number {
  const ph = 1.0 + (raw / 4095) * 11.0;
  return Math.round(ph * 100) / 100;
}

// APIO Ch1 → Glucose: map 12-bit ADC range to 50–300 mg/dL
function adcToGlucose(raw: number): number {
  return Math.round(50 + (raw / 4095) * 250);
}

// ─── NDEF record parsers ───────────────────────────────────────────────────

/**
 * Binary format (NHS3152 SHR / proprietary):
 * Bytes 0-1  : flags / status (uint16 LE) – ignored
 * Bytes 2-3  : internal temperature ADC raw (uint16 LE)
 * Bytes 4-5  : APIO Ch0 ADC raw – pH (uint16 LE)
 * Bytes 6-7  : APIO Ch1 ADC raw – glucose (uint16 LE)
 */
function parseBinaryRecord(data: DataView): SensorReading | null {
  if (data.byteLength < 8) return null;
  const tempRaw = data.getUint16(2, true);
  const phRaw = data.getUint16(4, true);
  const glucoseRaw = data.getUint16(6, true);
  return {
    temperature: adcToTemperature(tempRaw),
    pH: adcToPH(phRaw),
    glucose: adcToGlucose(glucoseRaw),
    timestamp: BigInt(Date.now()) * 1_000_000n,
  };
}

/** CSV/semicolon text: "36.8,7.38,95"  or  "36.8;7.38;95" */
function parseTextRecord(text: string): SensorReading | null {
  const parts = text.trim().split(/[,;\t]+/);
  if (parts.length >= 3) {
    const temperature = Number.parseFloat(parts[0]);
    const pH = Number.parseFloat(parts[1]);
    const glucose = Number.parseFloat(parts[2]);
    if (
      !Number.isNaN(temperature) &&
      !Number.isNaN(pH) &&
      !Number.isNaN(glucose)
    ) {
      return {
        temperature,
        pH,
        glucose,
        timestamp: BigInt(Date.now()) * 1_000_000n,
      };
    }
  }
  // Try JSON fallback
  try {
    const json = JSON.parse(text);
    if (
      typeof json.temperature === "number" &&
      (typeof json.ph === "number" || typeof json.pH === "number") &&
      typeof json.glucose === "number"
    ) {
      return {
        temperature: json.temperature,
        pH: json.ph ?? json.pH,
        glucose: json.glucose,
        timestamp: BigInt(Date.now()) * 1_000_000n,
      };
    }
    // ADC fields in JSON
    if (
      typeof json.tempAdc === "number" &&
      typeof json.phAdc === "number" &&
      typeof json.glucoseAdc === "number"
    ) {
      return {
        temperature: adcToTemperature(json.tempAdc),
        pH: adcToPH(json.phAdc),
        glucose: adcToGlucose(json.glucoseAdc),
        timestamp: BigInt(Date.now()) * 1_000_000n,
      };
    }
  } catch {
    // not JSON
  }
  return null;
}

function parseNDEFRecord(record: NDEFRecord): SensorReading | null {
  try {
    if (!record.data) return null;

    const view = new DataView(
      record.data instanceof ArrayBuffer ? record.data : record.data.buffer,
    );

    const recordType = record.recordType ?? "";
    const mediaType = record.mediaType ?? "";
    const type = (recordType + mediaType).toLowerCase();

    if (
      type.includes("nhs3152") ||
      type === "mime" ||
      type === "" ||
      type === "unknown"
    ) {
      const fromBinary = parseBinaryRecord(view);
      if (fromBinary) return fromBinary;
    }

    const decoder = new TextDecoder();
    const text = decoder.decode(view);
    return parseTextRecord(text);
  } catch {
    console.warn("[NHS3152] Failed to parse NDEF record");
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useNFC(onReading: (r: SensorReading) => void): UseNFCReturn {
  const nfcAvailable = typeof NDEFReader !== "undefined";
  const [isScanning, setIsScanning] = useState(false);
  const [lastReading, setLastReading] = useState<SensorReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const callbackRef = useRef(onReading);
  callbackRef.current = onReading;

  const startScan = useCallback(async () => {
    if (!nfcAvailable) return;
    try {
      const reader = new NDEFReader();
      const controller = new AbortController();
      abortRef.current = controller;
      await reader.scan({ signal: controller.signal });
      setIsScanning(true);
      setError(null);
      reader.onreading = (event: NDEFReadingEvent) => {
        for (const record of event.message.records) {
          const reading = parseNDEFRecord(record);
          if (reading) {
            setLastReading(reading);
            callbackRef.current(reading);
            break;
          }
        }
      };
      reader.onreadingerror = () => {
        setError("Failed to read NFC tag – check chip is within range");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "NFC scan failed");
      setIsScanning(false);
    }
  }, [nfcAvailable]);

  const stopScan = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsScanning(false);
  }, []);

  return { nfcAvailable, isScanning, startScan, stopScan, lastReading, error };
}
