/** SLO Watch. Chapter 1: the 40-connection recommendation pool, the flag, and acquire wait. */

export type GamePhase = "intro" | "running" | "won" | "lost";

export type Controls = {
  /** Percent of product-page traffic that calls Recommendation. */
  exposurePct: number;
  /** Stops new recommendation calls. In-flight holds still finish. */
  flagOff: boolean;
};

export type TickSnapshot = {
  t: number;
  wave: number;
  arrivals: number;
  admitted: number;
  inFlight: number;
  pending: number;
  poolUtil: number;
  /** Query occupancy, held flat so the acquire tail is the thing that moves. */
  concurrencyUtil: number;
  successRate: number;
  /** 100 when acquire wait is near 0. 0 when acquire wait reaches the 600 ms incident. */
  errorBudget: number;
  successes: number;
  failures: number;
  sheds: number;
  retryAmp: number;
  cascadeRisk: number;
  message: string;
};

export type GameResult = {
  outcome: "won" | "lost";
  reason: string;
  score: number;
  waveReached: number;
  successRate: number;
  chapterHref: string;
  chapterLabel: string;
  shareText: string;
  takeaway: string;
  debrief: string;
  before: string;
  after: string;
  changed: string;
  metrics: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "neutral" }[];
};

export const TICK_MS = 200;
export const DURATION_S = 48;
export const POOL = 40;
export const QUERY_MS = 70;
export const ACQUIRE_BAR_MS = 50;
/** Unused by the drill. Kept so older imports still resolve. */
export const SLO_TARGET = 0.995;
export const START_BUDGET = 100;

const BASE_RATE = 400;
const BURST_RATE = 680;
const QUERY_S = QUERY_MS / 1000;
const CAPACITY = POOL / QUERY_S;

export type EngineState = {
  t: number;
  pending: number;
  successes: number;
  goodSamples: number;
  samples: number;
  peakUtil: number;
  peakPending: number;
  peakAcquire: number;
  cascade: boolean;
};

export function waveForTime(t: number): number {
  if (t < 16) return 1;
  if (t < 32) return 2;
  return 3;
}

export function createEngine(): EngineState {
  return {
    t: 0,
    pending: 0,
    successes: 0,
    goodSamples: 0,
    samples: 0,
    peakUtil: 0,
    peakPending: 0,
    peakAcquire: 0,
    cascade: false,
  };
}

export function emptySloSnap(message?: string): TickSnapshot {
  return {
    t: 0,
    wave: 1,
    arrivals: BASE_RATE,
    admitted: BASE_RATE,
    inFlight: 28,
    pending: 0,
    poolUtil: 28 / POOL,
    concurrencyUtil: QUERY_MS / 100,
    successRate: 1,
    errorBudget: 100,
    successes: 0,
    failures: 0,
    sheds: 0,
    retryAmp: 1,
    cascadeRisk: 0,
    message:
      message ??
      "Recommendation allows 40 connections. The query holds one for 70 ms. A 1.7× burst is about to fill the spare connections.",
  };
}

function acquireMs(pending: number): number {
  if (pending <= 1) return 2;
  return Math.min(2000, pending * 7.5);
}

function headroom(acquire: number): number {
  return Math.max(0, Math.min(100, 100 * (1 - acquire / 600)));
}

export function tick(
  state: EngineState,
  controls: Controls,
  dt = TICK_MS / 1000,
): { state: EngineState; snap: TickSnapshot; done?: GameResult } {
  const t = state.t + dt;
  const wave = waveForTime(t);
  const exposure = Math.max(0, Math.min(100, controls.exposurePct));
  const base = t < 16 ? BASE_RATE : BURST_RATE;
  const arrivals = controls.flagOff ? 0 : base * (exposure / 100);
  const pending = Math.max(0, state.pending + (arrivals - CAPACITY) * dt);
  const busy = pending > 0.05 ? POOL : Math.min(POOL, arrivals * QUERY_S);
  const acquire = acquireMs(pending);
  const samples = state.samples + 1;
  const goodSamples = state.goodSamples + (acquire < ACQUIRE_BAR_MS ? 1 : 0);
  const successRate = goodSamples / samples;
  const poolUtil = busy / POOL;
  const successes = state.successes + arrivals * dt;
  const next: EngineState = {
    t,
    pending,
    successes,
    goodSamples,
    samples,
    peakUtil: Math.max(state.peakUtil, poolUtil),
    peakPending: Math.max(state.peakPending, pending),
    peakAcquire: Math.max(state.peakAcquire, acquire),
    cascade: pending > 80,
  };

  const message = controls.flagOff
    ? "The flag is off for new calls. In-flight holds finish. The query stays at 70 ms, and acquire wait is the queue draining."
    : pending > 1
      ? `Pending acquisitions are ${pending.toFixed(0)}. Acquire wait is ${acquire.toFixed(0)} ms. The query is still ${QUERY_MS} ms.`
      : `${arrivals.toFixed(0)} lookups a second need about ${(arrivals * QUERY_S).toFixed(1)} of ${POOL} connections.`;

  const snap: TickSnapshot = {
    t,
    wave,
    arrivals,
    admitted: arrivals,
    inFlight: busy,
    pending,
    poolUtil,
    concurrencyUtil: QUERY_MS / 100,
    successRate,
    errorBudget: headroom(acquire),
    successes,
    failures: 0,
    sheds: 0,
    retryAmp: exposure / 100,
    cascadeRisk: Math.min(1, pending / 400),
    message,
  };

  if (t < DURATION_S) return { state: next, snap };

  const won = pending < 1 && acquire < ACQUIRE_BAR_MS;
  const reason = won
    ? controls.flagOff
      ? "New recommendation calls stopped, pending acquisitions finished, and acquire wait stayed under 50 ms. The pool stayed at 40."
      : "Exposure left enough spare connections for the burst. Pending finished at 0 and acquire wait stayed under 50 ms."
    : "The burst filled the 40 connections. Pending acquisitions were still waiting, and acquire time was the queue, not a slower query.";

  const done: GameResult = {
    outcome: won ? "won" : "lost",
    reason,
    score: Math.round(headroom(acquire)),
    waveReached: wave,
    successRate,
    chapterHref: "/system-design/chapter-1",
    chapterLabel: "Ch.1 · Resource contention",
    shareText: `SLO Watch: acquire wait ${acquire.toFixed(0)} ms, pending ${pending.toFixed(0)}, pool ${POOL}. https://baodium.com/play/slo-watch`,
    takeaway:
      "Disabling the flag stops new recommendation calls. Making the pool bigger is not how this incident ends. The query stays near 70 ms while acquire wait is the line that moves.",
    debrief: `Acquire ${acquire.toFixed(0)} ms. Pending ${pending.toFixed(0)}. Query ${QUERY_MS} ms. Exposure ${exposure.toFixed(0)}%. Flag ${controls.flagOff ? "off" : "on"}.`,
    before: "400 lookups a second at 70 ms is 28 of 40 connections. The burst is about 1.7 times that rate.",
    after: won
      ? "Pending acquisitions ended at zero and acquire wait stayed under the 50 ms bar."
      : "All 40 connections stayed assigned, and acquire wait carried the queue.",
    changed: controls.flagOff
      ? "The flag stopped new recommendation calls. Work already holding a connection was left to finish."
      : "Exposure changed how many lookups a second asked the shared pool for a connection.",
    metrics: [
      { label: "Acquire wait", value: `${acquire.toFixed(0)} ms`, tone: acquire < ACQUIRE_BAR_MS ? "ok" : "bad" },
      { label: "Pending", value: pending.toFixed(0), tone: pending < 1 ? "ok" : "bad" },
      { label: "Query", value: `${QUERY_MS} ms`, tone: "neutral" },
      { label: "Pool", value: `${POOL}`, tone: "neutral" },
    ],
  };

  return { state: next, snap, done };
}
