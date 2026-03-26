import { useEffect, useRef } from "react";

export interface SensorReading {
  timestamp: bigint;
  temperature: number;
  pH: number;
  glucose: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomWalkInt(
  current: number,
  step: number,
  min: number,
  max: number,
) {
  const delta = Math.round((Math.random() - 0.5) * step);
  return clamp(current + delta, min, max);
}

// ADC conversion mirrors useNFC.ts formulas
function adcToTemperature(raw: number): number {
  const millivolts = (raw / 4096) * 1200;
  const celsius = (millivolts - 600) / 1.77;
  return Math.round(celsius * 10) / 10;
}

function adcToPH(raw: number): number {
  return Math.round((1.0 + (raw / 4095) * 11.0) * 100) / 100;
}

function adcToGlucose(raw: number): number {
  return Math.round(50 + (raw / 4095) * 250);
}

// Physiological starting points back-calculated to ADC counts
// Normal body temp ~37°C → raw ≈ 2270
// Normal pH ~7.0  → raw = (7.0-1.0)/11.0 * 4095 ≈ 2234
// Normal glucose ~100 mg/dL → raw = (100-50)/250 * 4095 ≈ 819

export function useSimulation(
  active: boolean,
  onReading: (r: SensorReading) => void,
) {
  const adcRef = useRef({ tempAdc: 2270, phAdc: 2234, glucoseAdc: 819 });
  const callbackRef = useRef(onReading);
  callbackRef.current = onReading;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const s = adcRef.current;
      const newTempAdc = randomWalkInt(s.tempAdc, 14, 2090, 2550); // ~35–40°C
      const newPhAdc = randomWalkInt(s.phAdc, 20, 2030, 2570); // ~6.5–8.0 pH (1–12 range)
      const newGlucAdc = randomWalkInt(s.glucoseAdc, 41, 328, 1311); // ~70–130 mg/dL (50–300 range)
      adcRef.current = {
        tempAdc: newTempAdc,
        phAdc: newPhAdc,
        glucoseAdc: newGlucAdc,
      };
      callbackRef.current({
        timestamp: BigInt(Date.now()) * 1_000_000n,
        temperature: adcToTemperature(newTempAdc),
        pH: adcToPH(newPhAdc),
        glucose: adcToGlucose(newGlucAdc),
      });
    }, 2000);
    return () => clearInterval(id);
  }, [active]);
}
