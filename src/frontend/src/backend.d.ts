import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SensorReading {
    pH: number;
    temperature: number;
    glucose: number;
    timestamp: bigint;
}
export interface backendInterface {
    addReading(reading: SensorReading): Promise<void>;
    getAllReadings(): Promise<Array<SensorReading>>;
}
