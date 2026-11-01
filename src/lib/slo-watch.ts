import { clampBusy, utilization } from "@/lib/sim/bounds";

/** Pure engine for SLO Watch. dual knobs (pool vs concurrency), retries, shedding. */

export type RetryPolicy = "off" | "cautious" | "aggressive";

export type GamePhase = "intro" | "running" | "won" | "lost";

export type Controls = {
  /** Connection pool size. hard cap on concurrent holds. */
  poolSize: number;
  /** Edge concurrency limit. admission before the pool. */
  concurrencyLimit: number;
  retries: RetryPolicy;
  shedding: boolean;
};

export type TickSnapshot = {
  t: number;
  wave: number;
  arrivals: number;
  /** Work admitted past the concurrency gate. */
  admitted: number;
  inFlight: number;
  /** Waiting for a free pool slot (concurrency > pool). */
  pending: number;
  poolUtil: number;
  concurrencyUtil: number;
  successRate: number;
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
export const SLO_TARGET = 0.995;
export const START_BUDGET = 100;

const WAVE_ENDS = [16, 32, 48] as const;

export function waveForTime(t: number): number {
  if (t < WAVE_ENDS[0]) return 1;
  if (t < WAVE_ENDS[1]) return 2;
  return 3;
}

/** Base arrival rate (req/s) for the teaching scenario. */
export function baseArrivalRate(t: number, wave: number): number {
  const local = t - (wave === 1 ? 0 : WAVE_ENDS[wave - 2]);
  const pulse = Math.sin((local / 5) * Math.PI) * 0.5 + 0.5;
  if (wave === 1) return 35 + pulse * 25;
  if (wave === 2) return 70 + pulse * 45;
  const spike = local < 4 ? local / 4 : 1;
  return 95 + spike * 75 + pulse * 35;
}

/**
 * Retry amplification of offered load.
 * Aggressive retries under saturation multiply arrivals (retry storm).
 * Cautious backs off when util is high.
 */
export function retryMultiplier(
  policy: RetryPolicy,
  poolUtil: number,
  recentFailRate: number,
): number {
  if (policy === "off") return 1;
  if (policy === "cautious") {
    if (poolUtil > 0.9 || recentFailRate > 0.05) return 1.05; // near-off under pain
    return 1.08;
  }
  // aggressive
  if (poolUtil > 0.9 || recentFailRate > 0.08) return 2.4 + recentFailRate * 3;
  if (poolUtil > 0.75) return 1.7;
  return 1.25;
}

/** Mean occupancy while holding a connection (seconds). */
export function holdTimeSec(poolUtil: number, pending: number, poolSize: number): number {
  const contention = poolUtil * poolUtil * 0.42;
  const queueStretch = (pending / Math.max(1, poolSize)) * 0.15;
  return 0.14 + contention + queueStretch;
}

export type EngineState = {
  t: number;
  successes: number;
  failures: number;
  sheds: number;
  inFlight: number;
  pending: number;
  errorBudget: number;
  cascade: boolean;
  recentFailEwma: number;
  peakUtil: number;
  lastMessage: string;
};

export function createEngine(): EngineState {
  return {
    t: 0,
    successes: 0,
    failures: 0,
    sheds: 0,
    inFlight: 0,
    pending: 0,
    errorBudget: START_BUDGET,
    cascade: false,
    recentFailEwma: 0,
    peakUtil: 0,
    lastMessage: "Warm traffic. Three waves ahead. Watch the budget burn.",
  };
}

export function emptySloSnap(message?: string): TickSnapshot {
  return {
    t: 0,
    wave: 1,
    arrivals: 0,
    admitted: 0,
    inFlight: 0,
    pending: 0,
    poolUtil: 0,
    concurrencyUtil: 0,
    successRate: 0,
    errorBudget: START_BUDGET,
    successes: 0,
    failures: 0,
    sheds: 0,
    retryAmp: 1,
    cascadeRisk: 0,
    message: message ?? "Idle. Start a shift to burn the error budget.",
  };
}

export function tick(
  state: EngineState,
  controls: Controls,
  dt = TICK_MS / 1000,
): { state: EngineState; snap: TickSnapshot; done?: GameResult } {
  const t = state.t + dt;
  const wave = waveForTime(t);
  const pool = Math.max(1, controls.poolSize);
  const conc = Math.max(1, controls.concurrencyLimit);

  const poolUtilBefore = utilization(state.inFlight, pool);
  const retryAmp = retryMultiplier(
    controls.retries,
    poolUtilBefore,
    state.recentFailEwma,
  );
  const offeredRate = baseArrivalRate(t, wave) * retryAmp;
  let offered = offeredRate * dt;

  // Concurrency gate: only `conc` requests may be in the service (inFlight + pending).
  const inService = state.inFlight + state.pending;
  let shedCount = 0;
  let rejectedAtEdge = 0;

  if (controls.shedding) {
    const room = Math.max(0, conc - inService);
    const accept = Math.min(offered, room);
    shedCount = Math.max(0, offered - accept);
    offered = accept;
  } else if (inService + offered > conc) {
    // Hard concurrency wall without shedding → timeouts/rejects at the edge.
    const room = Math.max(0, conc - inService);
    rejectedAtEdge = Math.max(0, offered - room);
    offered = room;
  }

  let pending = state.pending + offered;
  // Acquire into pool slots.
  const freeSlots = Math.max(0, pool - state.inFlight);
  const acquired = Math.min(pending, freeSlots);
  pending -= acquired;
  let inFlight = clampBusy(state.inFlight + acquired, pool);

  // Pending beyond a soft wait budget fails (acquire timeout analogue).
  const pendingFail = Math.max(0, pending - pool * 1.5) * 0.35;
  pending = Math.min(pending, pool * 1.5);

  const poolUtil = utilization(inFlight, pool);
  const hold = holdTimeSec(Math.min(1, poolUtil), pending, pool);
  const busy = Math.min(inFlight, pool);
  const completions = busy * (1 - Math.exp(-dt / hold));
  inFlight = clampBusy(Math.max(0, inFlight - completions), pool);

  // Intrinsic fail chance rises with pool contention + pending.
  const failFrac =
    poolUtil > 1.05
      ? 0.42
      : poolUtil > 0.95
        ? 0.2
        : poolUtil > 0.88
          ? 0.08
          : poolUtil > 0.8
            ? 0.03
            : poolUtil > 0.7
              ? 0.01
              : 0.0015;
  const pendingPressure = Math.min(0.25, (pending / pool) * 0.08);
  const softFails = completions * (failFrac + pendingPressure);
  const successes = state.successes + Math.max(0, completions - softFails);
  const failures =
    state.failures +
    softFails +
    shedCount +
    rejectedAtEdge +
    pendingFail;
  const sheds = state.sheds + shedCount;

  const tickDecided = completions + shedCount + rejectedAtEdge + pendingFail;
  const tickFailRate =
    tickDecided <= 1e-9 ? 0 : (softFails + shedCount + rejectedAtEdge + pendingFail) / tickDecided;
  const recentFailEwma = state.recentFailEwma * 0.7 + tickFailRate * 0.3;

  let cascade = state.cascade;
  let message = state.lastMessage;

  if (
    controls.retries === "aggressive" &&
    poolUtil > 0.88 &&
    retryAmp > 1.8 &&
    (rejectedAtEdge > 0 || softFails > completions * 0.05)
  ) {
    cascade = true;
    message = "Retry storm. Callers are amplifying the outage.";
  } else if (pending > pool * 0.5) {
    message = `Pool saturated. ${pending.toFixed(0)} waiting for a free connection (concurrency ${conc} > useful pool work).`;
  } else if (!controls.shedding && rejectedAtEdge > 0) {
    message = "Concurrency limit hit without shedding. Edge rejects.";
  } else if (controls.shedding && shedCount > 0) {
    message = "Shedding load. Intentional 503s, pool protected.";
  } else if (conc < pool * 0.55 && wave >= 2) {
    message = "Concurrency below pool. Headroom unused, but latency gated.";
  } else if (pool < conc * 0.6 && wave >= 2) {
    message = "Pool smaller than concurrency. Pending grows; size the pool or shed.";
  } else if (wave === 3) {
    message = "Wave 3 spike. Aggressive retries can cascade.";
  } else if (wave === 2) {
    message = "Wave 2. Watch pool util and pending climb.";
  } else if (poolUtil < 0.55) {
    message = "Headroom looks fine. For now.";
  } else {
    message = "Contention rising. Occupancy is stretching.";
  }

  const total = successes + failures;
  const successRate = total > 0 ? successes / total : 1;
  // Error budget: availability SLO. Sheds and hard fails both spend budget.
  const budgetDrain =
    successRate < SLO_TARGET
      ? (SLO_TARGET - successRate) * 2200 * dt
      : -5 * dt;
  let errorBudget = Math.min(START_BUDGET, state.errorBudget - budgetDrain);
  if (cascade) errorBudget -= 22 * dt;

  const concurrencyUtil = Math.min(1.25, (inFlight + pending) / conc);
  const cascadeRisk = Math.min(
    1,
    Math.max(0, poolUtil - 0.7) * 1.4 +
      (controls.retries === "aggressive" ? 0.25 + Math.max(0, retryAmp - 1) * 0.15 : 0) +
      Math.max(0, pending / pool - 0.3) * 0.3,
  );
  const peakUtil = Math.max(state.peakUtil, poolUtil);

  const next: EngineState = {
    t,
    successes,
    failures,
    sheds,
    inFlight,
    pending,
    errorBudget,
    cascade,
    recentFailEwma,
    peakUtil,
    lastMessage: message,
  };

  const snap: TickSnapshot = {
    t,
    wave,
    arrivals: offeredRate,
    admitted: offered / dt,
    inFlight,
    pending,
    poolUtil,
    concurrencyUtil,
    successRate,
    errorBudget: Math.max(0, errorBudget),
    successes,
    failures,
    sheds,
    retryAmp,
    cascadeRisk,
    message,
  };

  if (errorBudget <= 0) {
    return {
      state: next,
      snap: { ...snap, errorBudget: 0 },
      done: buildResult("lost", next, snap, wave, controls),
    };
  }

  if (t >= DURATION_S) {
    // Must still be roughly on SLO after surviving. not just budget > 0 from early headroom.
    const held =
      successRate >= SLO_TARGET - 0.012 && !cascade && peakUtil < 1.2;
    return {
      state: next,
      snap,
      done: buildResult(held ? "won" : "lost", next, snap, wave, controls),
    };
  }

  return { state: next, snap };
}

function buildResult(
  outcome: "won" | "lost",
  state: EngineState,
  snap: TickSnapshot,
  wave: number,
  controls: Controls,
): GameResult {
  const successRate = snap.successRate;
  const score = Math.round(
    Math.max(0, state.errorBudget) * 11 +
      successRate * 380 +
      (outcome === "won" ? 240 : wave * 35) +
      Math.max(0, 100 - snap.poolUtil * 70) +
      (controls.shedding ? 25 : 0) -
      (controls.retries === "aggressive" ? 40 : 0),
  );

  const chapter =
    state.cascade || snap.cascadeRisk > 0.75
      ? {
          href: "/system-design/chapter-4",
          label: "Ch.4. Service communication and cascading failure",
        }
      : {
          href: "/system-design/chapter-1",
          label: "Ch.1. Resource contention in production",
        };

  const reason =
    outcome === "won"
      ? "You kept checkout inside the SLO through three waves."
      : state.cascade
        ? "A retry storm turned saturation into a cascade."
        : state.errorBudget <= 0
          ? "Error budget hit zero. Too many failed requests under load."
          : successRate < SLO_TARGET - 0.012
            ? "Budget limped to the end, but success rate still missed the SLO."
            : "Peak pool saturation was too deep. Headroom gone.";

  const takeaway =
    "Pool size and concurrency are different levers: one caps holds, the other caps admission. Aggressive retries under saturation spend the budget twice.";

  const budgetLeft = Math.max(0, state.errorBudget);
  const debrief = `Success ${(successRate * 100).toFixed(2)}% (SLO ${(SLO_TARGET * 100).toFixed(1)}%) · budget ${budgetLeft.toFixed(0)}% · peak util ${(state.peakUtil * 100).toFixed(0)}% · sheds ${state.sheds.toFixed(0)} · retry amp ${snap.retryAmp.toFixed(2)}×. Pool ${controls.poolSize}, concurrency ${controls.concurrencyLimit}, retries ${controls.retries}${controls.shedding ? ", shedding on" : ""}.`;

  const before =
    "Default-sized pool under Wave 3: util climbs past 90%, retries amplify load, error budget drains, and a cascade becomes likely.";
  const after = outcome === "won"
    ? `You finished with success ${(successRate * 100).toFixed(2)}%, budget ${budgetLeft.toFixed(0)}% left, peak util ${(state.peakUtil * 100).toFixed(0)}%, retry amp ${snap.retryAmp.toFixed(2)}× (pool ${controls.poolSize}, concurrency ${controls.concurrencyLimit}, retries ${controls.retries}${controls.shedding ? ", shedding on" : ""}).`
    : `Run ended at wave ${wave}: success ${(successRate * 100).toFixed(2)}%, budget ${budgetLeft.toFixed(0)}%, peak util ${(state.peakUtil * 100).toFixed(0)}%, retry amp ${snap.retryAmp.toFixed(2)}×${state.cascade ? ". Cascade fired" : ""}.`;
  const changed =
    controls.retries === "aggressive" && state.peakUtil > 0.85
      ? "Aggressive retries under saturation multiplied offered load. The budget paid twice for the same work."
      : controls.concurrencyLimit < controls.poolSize * 0.7
        ? "Admission capped below pool capacity. You protected holds, but may have shed useful traffic early."
        : controls.shedding && outcome === "won"
          ? "Shedding under pressure traded a few requests to keep the pool from locking up. Budget survived."
          : controls.poolSize >= 160 && controls.retries !== "aggressive"
            ? "A larger pool absorbed Wave 3 holds without a retry storm. Util stayed recoverable."
            : "The levers you moved did not separate admission from holds. Saturation still owned the shift.";

  const metrics: GameResult["metrics"] = [
    {
      label: "Success",
      value: `${(successRate * 100).toFixed(2)}%`,
      tone: successRate >= SLO_TARGET ? "ok" : successRate >= SLO_TARGET - 0.01 ? "warn" : "bad",
    },
    {
      label: "Budget left",
      value: `${budgetLeft.toFixed(0)}%`,
      tone: budgetLeft > 40 ? "ok" : budgetLeft > 10 ? "warn" : "bad",
    },
    {
      label: "Peak util",
      value: `${(state.peakUtil * 100).toFixed(0)}%`,
      tone: state.peakUtil < 0.85 ? "ok" : state.peakUtil < 0.95 ? "warn" : "bad",
    },
    {
      label: "Retry amp",
      value: `${snap.retryAmp.toFixed(2)}×`,
      tone: snap.retryAmp <= 1.15 ? "ok" : snap.retryAmp <= 1.6 ? "warn" : "bad",
    },
  ];

  const shareText =
    outcome === "won"
      ? `I held the SLO in Baodium’s SLO Watch (score ${score}). Pool under fire, no cascade. Try it: https://baodium.com/play/slo-watch`
      : `SLO Watch got me. ${state.cascade ? "retry cascade" : "error budget gone"} at wave ${wave}. Can you hold it? https://baodium.com/play/slo-watch`;

  return {
    outcome,
    reason,
    score,
    waveReached: wave,
    successRate,
    chapterHref: chapter.href,
    chapterLabel: chapter.label,
    shareText,
    takeaway,
    debrief,
    before,
    after,
    changed,
    metrics,
  };
}
