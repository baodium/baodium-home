/** Tail Latency. Chapter 2: acquire p95 moves, the query stays near 70 ms. No hedges. */

export type TailControls = {
  /** Lookups per second offered to the 40-connection pool. */
  lookupsPerSec: number;
};

export type TailSnap = {
  t: number;
  p50: number;
  p95: number;
  p99: number;
  cost: number;
  goodput: number;
  queueDepth: number;
  util: number;
  samples: number[];
  hedgeExtra: number;
  sampleCount: number;
  message: string;
};

export type TailResult = {
  outcome: "won" | "lost";
  score: number;
  reason: string;
  chapterHref: string;
  chapterLabel: string;
  takeaway: string;
  debrief: string;
  before: string;
  after: string;
  changed: string;
  metrics: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "neutral" }[];
};

export const TAIL_TICK_MS = 200;
export const TAIL_DURATION_S = 32;
/** Acquire p95 bar from the chapter. The query is not this number. */
export const P99_BUDGET_MS = 50;
export const QUERY_MS = 70;
export const BASE_RPS = 400;

export type TailState = {
  t: number;
  samples: number[];
  sampleCount: number;
  underSec: number;
};

function acquireP95(rate: number): number {
  if (rate <= 300) return 2;
  if (rate <= 400) return 2 + ((rate - 300) / 100) * 6;
  if (rate <= 480) return 8 + ((rate - 400) / 80) * 17;
  if (rate <= 560) return 25 + ((rate - 480) / 80) * 55;
  return 80 + (rate - 560) * 0.4;
}

export function createTail(seed = 42): TailState {
  // This deterministic drill has no random inputs; retain the shared engine API.
  void seed;
  return { t: 0, samples: [], sampleCount: 0, underSec: 0 };
}

export function emptyTailSnap(message?: string): TailSnap {
  return {
    t: 0,
    p50: QUERY_MS,
    p95: 8,
    p99: 12,
    cost: 1,
    goodput: 1,
    queueDepth: 0,
    util: 0.7,
    samples: [],
    hedgeExtra: 0,
    sampleCount: 0,
    message: message ?? "The query stays near 70 ms. Acquire p95 is the line that moves with load.",
  };
}

export function tickTail(
  state: TailState,
  controls: TailControls,
  dt = TAIL_TICK_MS / 1000,
): { state: TailState; snap: TailSnap; done?: TailResult } {
  const t = state.t + dt;
  const rate = Math.max(100, Math.min(700, controls.lookupsPerSec));
  const p95 = acquireP95(rate);
  const p99 = p95 <= 8 ? p95 + 4 : p95 * 1.15;
  const demand = rate * (QUERY_MS / 1000);
  const util = Math.min(1, demand / 40);
  const queueDepth = Math.max(0, demand - 40);
  const sample = p95;
  const samples = [...state.samples, sample].slice(-64);
  const sampleCount = state.sampleCount + 1;
  const underSec = p95 < P99_BUDGET_MS ? state.underSec + dt : state.underSec;
  const goodput = p95 < P99_BUDGET_MS ? 1 : 0.72;

  const message =
    p95 < P99_BUDGET_MS
      ? `Acquire p95 is ${p95.toFixed(0)} ms. The query is still ${QUERY_MS} ms. ${rate.toFixed(0)} lookups a second is inside the passing stages.`
      : `Acquire p95 is ${p95.toFixed(0)} ms, past the 50 ms bar. The query is still ${QUERY_MS} ms. The tail is the wait for a connection.`;

  const next: TailState = { t, samples, sampleCount, underSec };
  const snap: TailSnap = {
    t,
    p50: QUERY_MS,
    p95,
    p99,
    cost: 1,
    goodput,
    queueDepth,
    util,
    samples,
    hedgeExtra: 0,
    sampleCount,
    message,
  };

  if (t < TAIL_DURATION_S) return { state: next, snap };

  const won = p95 < P99_BUDGET_MS && rate <= 400 && sampleCount >= 40;
  const done: TailResult = {
    outcome: won ? "won" : "lost",
    score: Math.round(Math.max(0, 100 - p95)),
    reason: won
      ? "Acquire p95 stayed under 50 ms. The query stayed at 70 ms, so the tail was not a slower database call."
      : "Acquire p95 crossed 50 ms while the query stayed at 70 ms. That is the load-test failure, not a second copy of the request.",
    chapterHref: "/system-design/chapter-2",
    chapterLabel: "Ch.2 · Requests, latency, throughput",
    takeaway:
      "In this chapter the tail that fails the bar is acquire time. The query stays near its baseline. The passing rate is 400 lookups a second.",
    debrief: `Query ${QUERY_MS} ms. Acquire p95 ${p95.toFixed(0)} ms. Lookups ${rate.toFixed(0)}/s.`,
    before: "At 400 per second, acquire p95 is about 8 ms. At 560 it is about 80 ms.",
    after: won ? "The offered rate stayed on a passing stage." : "The offered rate was a stage the table marks as failed.",
    changed: "The lookup rate changed acquire wait. It did not change the query.",
    metrics: [
      { label: "Query", value: `${QUERY_MS} ms`, tone: "neutral" },
      { label: "Acquire p95", value: `${p95.toFixed(0)} ms`, tone: won ? "ok" : "bad" },
      { label: "Lookups", value: `${rate.toFixed(0)}/s`, tone: rate <= 400 ? "ok" : "bad" },
    ],
  };
  return { state: next, snap, done };
}
