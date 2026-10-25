/** Pure engine for SLO Watch — no DOM. Easy to unit-test and share. */

export type RetryPolicy = "off" | "cautious" | "aggressive";

export type GamePhase = "intro" | "running" | "won" | "lost";

export type Controls = {
  poolSize: number;
  concurrencyLimit: number;
  retries: RetryPolicy;
  shedding: boolean;
};

export type TickSnapshot = {
  t: number;
  wave: number;
  arrivals: number;
  inFlight: number;
  poolUtil: number;
  successRate: number;
  errorBudget: number;
  successes: number;
  failures: number;
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

export function retryMultiplier(policy: RetryPolicy, util: number): number {
  if (policy === "off") return 1;
  if (policy === "cautious") return util > 0.85 ? 1.18 : 1.03;
  if (util > 0.9) return 2.6;
  if (util > 0.75) return 1.85;
  return 1.3;
}

/** Mean occupancy while holding a connection (seconds). */
export function holdTimeSec(util: number): number {
  return 0.16 + util * util * 0.42;
}

export type EngineState = {
  t: number;
  successes: number;
  failures: number;
  inFlight: number;
  errorBudget: number;
  cascade: boolean;
  lastMessage: string;
};

export function createEngine(): EngineState {
  return {
    t: 0,
    successes: 0,
    failures: 0,
    inFlight: 0,
    errorBudget: START_BUDGET,
    cascade: false,
    lastMessage: "Warm traffic. Defaults won’t survive Wave 3 — size up.",
  };
}

export function tick(
  state: EngineState,
  controls: Controls,
  dt = TICK_MS / 1000,
): { state: EngineState; snap: TickSnapshot; done?: GameResult } {
  const t = state.t + dt;
  const wave = waveForTime(t);
  const capacity = Math.max(1, Math.min(controls.poolSize, controls.concurrencyLimit));

  const utilBefore = Math.min(1.25, state.inFlight / capacity);
  const offeredRate =
    baseArrivalRate(t, wave) * retryMultiplier(controls.retries, utilBefore);
  let offered = offeredRate * dt;

  let shedCount = 0;
  if (controls.shedding) {
    // Admit up to remaining capacity; shed the rest as intentional 503s.
    const room = Math.max(0, capacity - state.inFlight);
    const accept = Math.min(offered, room);
    shedCount = Math.max(0, offered - accept);
    offered = accept;
  }

  let inFlight = state.inFlight + offered;
  let successes = state.successes;
  let failures = state.failures + shedCount;
  let cascade = state.cascade;
  let message = state.lastMessage;

  const util = Math.min(1.25, inFlight / capacity);
  const hold = holdTimeSec(Math.min(1, util));
  // Exponential completions so dt ≲ hold still leaves concurrent load (λ×W).
  const busy = Math.min(inFlight, capacity);
  const completions = busy * (1 - Math.exp(-dt / hold));
  inFlight = Math.max(0, inFlight - completions);

  // Intrinsic fail chance rises with contention
  const failFrac =
    util > 1.05
      ? 0.4
      : util > 0.95
        ? 0.18
        : util > 0.88
          ? 0.07
          : util > 0.8
            ? 0.025
            : util > 0.7
              ? 0.008
              : 0.0012;

  let overflow = 0;
  if (inFlight > capacity) {
    overflow = inFlight - capacity;
    inFlight = capacity;
    failures += overflow;
  }

  const softFails = completions * failFrac;
  failures += softFails;
  successes += Math.max(0, completions - softFails);

  if (controls.retries === "aggressive" && util > 0.9 && (overflow > 0 || failFrac > 0.05)) {
    cascade = true;
    message = "Retry storm — callers are amplifying the outage.";
  } else if (overflow > 0) {
    message = "Pool saturated. Excess requests fail at the edge.";
  } else if (controls.shedding && shedCount > 0) {
    message = "Shedding load — some 503s, pool protected.";
  } else if (wave === 3) {
    message = "Wave 3 spike. Aggressive retries can cascade.";
  } else if (wave === 2) {
    message = "Wave 2. Watch utilization climb.";
  } else if (util < 0.55) {
    message = "Headroom looks fine — for now.";
  } else {
    message = "Contention rising. Occupancy is stretching.";
  }

  const total = successes + failures;
  const successRate = total > 0 ? successes / total : 1;
  const budgetDrain =
    successRate < SLO_TARGET
      ? (SLO_TARGET - successRate) * 2200 * dt
      : -5 * dt;
  let errorBudget = Math.min(START_BUDGET, state.errorBudget - budgetDrain);
  if (cascade) errorBudget -= 20 * dt;

  const cascadeRisk = Math.min(
    1,
    Math.max(0, util - 0.7) * 1.5 + (controls.retries === "aggressive" ? 0.3 : 0),
  );

  const next: EngineState = {
    t,
    successes,
    failures,
    inFlight,
    errorBudget,
    cascade,
    lastMessage: message,
  };

  const snap: TickSnapshot = {
    t,
    wave,
    arrivals: offeredRate,
    inFlight,
    poolUtil: Math.min(1.25, inFlight / capacity),
    successRate,
    errorBudget: Math.max(0, errorBudget),
    successes,
    failures,
    cascadeRisk,
    message,
  };

  if (errorBudget <= 0) {
    return {
      state: next,
      snap: { ...snap, errorBudget: 0 },
      done: buildResult("lost", next, snap, wave),
    };
  }

  if (t >= DURATION_S) {
    return {
      state: next,
      snap,
      done: buildResult("won", next, snap, wave),
    };
  }

  return { state: next, snap };
}

function buildResult(
  outcome: "won" | "lost",
  state: EngineState,
  snap: TickSnapshot,
  wave: number,
): GameResult {
  const successRate = snap.successRate;
  const score = Math.round(
    Math.max(0, state.errorBudget) * 12 +
      successRate * 400 +
      (outcome === "won" ? 250 : wave * 40) +
      Math.max(0, 100 - snap.poolUtil * 80),
  );

  const chapter =
    state.cascade || snap.cascadeRisk > 0.75
      ? {
          href: "/system-design/chapter-4",
          label: "Ch.4 — Service communication and cascading failure",
        }
      : {
          href: "/system-design/chapter-1",
          label: "Ch.1 — Resource contention in production",
        };

  const reason =
    outcome === "won"
      ? "You kept checkout inside the SLO through three waves."
      : state.cascade
        ? "A retry storm turned saturation into a cascade."
        : "Error budget hit zero — too many failed requests under load.";

  const shareText =
    outcome === "won"
      ? `I held the SLO in Baodium’s SLO Watch (score ${score}). Pool under fire, no cascade. Try it: https://baodium.com/play`
      : `SLO Watch got me — ${state.cascade ? "retry cascade" : "error budget gone"} at wave ${wave}. Can you hold it? https://baodium.com/play`;

  return {
    outcome,
    reason,
    score,
    waveReached: wave,
    successRate,
    chapterHref: chapter.href,
    chapterLabel: chapter.label,
    shareText,
  };
}
