/** Traffic Surge. Chapter 2 load test: admission sits on the last passing stage, 400/s. */

export type SurgeControls = {
  /** Highest lookups per second the load test is allowed to reach. */
  admitPerSec: number;
};

export type SurgeSnap = {
  t: number;
  arrivals: number;
  admitted: number;
  served: number;
  shed: number;
  queue: number;
  vipQueue: number;
  restQueue: number;
  p95: number;
  successRate: number;
  vipSuccessRate: number;
  underBudgetSec: number;
  happyMs: number;
  message: string;
};

export type SurgeResult = {
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

export const SURGE_TICK_MS = 200;
export const SURGE_DURATION_S = 36;
export const P95_LIMIT_MS = 50;
export const MIN_SERVED_RATE = 0.99;
/** Last passing stage in the chapter's table. */
export const CAPACITY = 400;

const STAGES = [300, 400, 480, 560] as const;

export type SurgeState = {
  t: number;
  served: number;
  shed: number;
  offered: number;
  underBudgetSec: number;
  peakP95: number;
  worstReject: number;
  happyMs: number;
  lastMessage: string;
};

export function createSurge(): SurgeState {
  return {
    t: 0,
    served: 0,
    shed: 0,
    offered: 0,
    underBudgetSec: 0,
    peakP95: 0,
    worstReject: 0,
    happyMs: 8,
    lastMessage: "The table starts at 300 lookups a second.",
  };
}

export function emptySurgeSnap(message?: string): SurgeSnap {
  return {
    t: 0,
    arrivals: 300,
    admitted: 300,
    served: 0,
    shed: 0,
    queue: 0,
    vipQueue: 0,
    restQueue: 0,
    p95: 2,
    successRate: 1,
    vipSuccessRate: 1,
    underBudgetSec: 0,
    happyMs: 8,
    message: message ?? "300 a second passes. 400 a second passes. 480 a second does not.",
  };
}

function offeredAt(t: number, limit: number): number {
  const allowed = STAGES.filter((stage) => stage <= limit + 0.5);
  const ladder = allowed.length > 0 ? allowed : [300];
  const index = Math.min(ladder.length - 1, Math.floor(Math.max(0, t) / 9));
  return ladder[index]!;
}

export function stageStats(rate: number): { p95: number; reject: number } {
  if (rate <= 300) return { p95: 2, reject: 0 };
  if (rate <= 400) return { p95: 2 + ((rate - 300) / 100) * 6, reject: 0 };
  if (rate <= 480) return { p95: 8 + ((rate - 400) / 80) * 17, reject: 0.02 * ((rate - 400) / 80) };
  return {
    p95: 25 + ((rate - 480) / 80) * 55,
    reject: 0.02 + ((rate - 480) / 80) * (120 / 560 - 0.02),
  };
}

export function tickSurge(
  state: SurgeState,
  controls: SurgeControls,
  dt = SURGE_TICK_MS / 1000,
): { state: SurgeState; snap: SurgeSnap; done?: SurgeResult } {
  const t = state.t + dt;
  const limit = Math.max(300, Math.min(560, controls.admitPerSec));
  const arrivals = offeredAt(t, limit);
  const { p95, reject } = stageStats(arrivals);
  const admittedRate = arrivals * (1 - reject);
  const served = state.served + admittedRate * dt;
  const shed = state.shed + arrivals * reject * dt;
  const offered = state.offered + arrivals * dt;
  const under = p95 < P95_LIMIT_MS && reject < 0.01 ? state.underBudgetSec + dt : state.underBudgetSec;
  const worstReject = Math.max(state.worstReject, reject);
  const peakP95 = Math.max(state.peakP95, p95);
  const successRate = 1 - worstReject;

  const message =
    reject >= 0.01
      ? `${arrivals.toFixed(0)} lookups a second rejects about ${(reject * 100).toFixed(1)} percent. Acquire p95 is ${p95.toFixed(0)} ms, and the pass bar is both p95 under 50 ms and rejections under 1 percent.`
      : `${arrivals.toFixed(0)} lookups a second keeps acquire p95 at ${p95.toFixed(0)} ms with no rejections. The chapter's last passing stage is 400.`;

  const next: SurgeState = {
    t,
    served,
    shed,
    offered,
    underBudgetSec: under,
    peakP95,
    worstReject,
    happyMs: p95,
    lastMessage: message,
  };

  const snap: SurgeSnap = {
    t,
    arrivals,
    admitted: admittedRate,
    served,
    shed,
    queue: 0,
    vipQueue: arrivals * reject,
    restQueue: admittedRate,
    p95,
    successRate,
    vipSuccessRate: successRate,
    underBudgetSec: under,
    happyMs: p95,
    message,
  };

  if (t < SURGE_DURATION_S) return { state: next, snap };

  const won = limit >= 390 && limit < 450 && worstReject < 0.01 && peakP95 < P95_LIMIT_MS;
  const reason = won
    ? "The load test stopped on the 400 per second stage. Acquire p95 stayed under 50 ms and rejections stayed under 1 percent."
    : limit < 390
      ? "300 per second passes, and so does 400. The admission limit can sit on that last passing stage."
      : "A later stage misses the bar. At 480 per second, acquire p95 can still be 25 ms while about 2 percent of requests are rejected.";

  const done: SurgeResult = {
    outcome: won ? "won" : "lost",
    score: Math.round((1 - worstReject) * 100),
    reason,
    chapterHref: "/system-design/chapter-2",
    chapterLabel: "Ch.2 · Requests, latency, throughput",
    takeaway:
      "The pass bar is acquire p95 under 50 ms and rejections under 1 percent. The 400 per second stage is the last one that clears both. That is where the admission limit sits.",
    debrief: `Limit ${limit.toFixed(0)}/s. Peak acquire p95 ${peakP95.toFixed(0)} ms. Worst rejection ${(worstReject * 100).toFixed(1)} percent.`,
    before: "300 and 400 lookups a second pass. 480 rejects about 2 percent. 560 rejects 120 of 560.",
    after: won
      ? "The test never left the passing stages."
      : "The test included a stage the chapter marks as failed.",
    changed: "The admission limit chose the highest stage the load test was allowed to reach.",
    metrics: [
      { label: "Acquire p95", value: `${peakP95.toFixed(0)} ms`, tone: peakP95 < P95_LIMIT_MS ? "ok" : "bad" },
      { label: "Rejections", value: `${(worstReject * 100).toFixed(1)}%`, tone: worstReject < 0.01 ? "ok" : "bad" },
      { label: "Limit", value: `${limit.toFixed(0)}/s`, tone: won ? "ok" : "warn" },
    ],
  };

  return { state: next, snap, done };
}
