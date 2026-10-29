import type { ControlValues, LabSnapshot, SeriesPoint } from "@/lib/experience/short-labs/types";

const SERIES_MAX = 48;

export function num(controls: ControlValues, id: string): number {
  const value = controls[id];
  return typeof value === "number" ? value : Number(value);
}

export function flag(controls: ControlValues, id: string): boolean {
  return controls[id] === true;
}

export function choice(controls: ControlValues, id: string): string {
  const value = controls[id];
  return typeof value === "string" ? value : "";
}

export function mem(snapshot: LabSnapshot | null, key: string, fallback = 0): number {
  const value = snapshot?.memory[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function round(value: number, digits = 0): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function advance(
  prev: LabSnapshot | null,
  controls: ControlValues,
  dt: number,
  patch: {
    metrics: Record<string, number>;
    point: Record<string, number>;
    nodes: LabSnapshot["nodes"];
    edges: LabSnapshot["edges"];
    narration: string;
    gates: Record<string, boolean>;
    challengePassed: boolean;
    challengeDetail: string;
    memory: Record<string, number>;
  },
): LabSnapshot {
  const elapsedSec = (prev?.elapsedSec ?? 0) + (prev ? dt : 0);
  const tick = (prev?.tick ?? 0) + (prev ? 1 : 0);
  const point: SeriesPoint = { t: round(elapsedSec, 2), ...patch.point };
  const series = prev ? [...prev.series, point] : [point];
  return {
    tick,
    elapsedSec: round(elapsedSec, 2),
    controls,
    metrics: patch.metrics,
    series: series.length > SERIES_MAX ? series.slice(series.length - SERIES_MAX) : series,
    nodes: patch.nodes,
    edges: patch.edges,
    narration: patch.narration,
    gates: patch.gates,
    challengePassed: patch.challengePassed,
    challengeDetail: patch.challengeDetail,
    memory: patch.memory,
  };
}

/** True once `ok` has held for `need` seconds. Resets when `ok` drops. */
export function hold(prev: LabSnapshot | null, key: string, ok: boolean, dt: number, need: number): { value: number; ready: boolean } {
  const value = ok ? mem(prev, key) + (prev ? dt : 0) : 0;
  return { value, ready: value >= need };
}
