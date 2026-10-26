/** Pure engine — Traffic Surge: shape/shed load under an RPS spike. */

export type SurgeControls = {
  /** Fraction of arrivals admitted (0–1). */
  admit: number;
  /** Soft queue cap — excess becomes 503. */
  queueCap: number;
  /** Prefer VIP traffic when shedding. */
  vipFirst: boolean;
};

export type SurgeSnap = {
  t: number;
  arrivals: number;
  admitted: number;
  served: number;
  shed: number;
  queue: number;
  p95: number;
  successRate: number;
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
};

export const SURGE_TICK_MS = 200;
export const SURGE_DURATION_S = 36;
export const P95_LIMIT_MS = 280;
export const MIN_SERVED_RATE = 0.55;

export type SurgeState = {
  t: number;
  served: number;
  shed: number;
  failed: number;
  queue: number;
  happyMs: number;
  lastMessage: string;
};

export function createSurge(): SurgeState {
  return {
    t: 0,
    served: 0,
    shed: 0,
    failed: 0,
    queue: 0,
    happyMs: 0,
    lastMessage: "Calm morning. Spike lands around 12s — decide who waits.",
  };
}

function arrivalCurve(t: number): number {
  if (t < 10) return 40 + Math.sin(t * 0.8) * 8;
  if (t < 14) return 40 + ((t - 10) / 4) * 160;
  if (t < 24) return 200 + Math.sin(t * 1.2) * 20;
  if (t < 28) return 200 - ((t - 24) / 4) * 120;
  return 70 + Math.sin(t) * 10;
}

/** Service capacity ≈ 90 rps steady; queue burns down at that rate. */
const CAPACITY = 90;

export function tickSurge(
  state: SurgeState,
  controls: SurgeControls,
  dt = SURGE_TICK_MS / 1000,
): { state: SurgeState; snap: SurgeSnap; done: SurgeResult | null } {
  const t = state.t + dt;
  const arrivals = arrivalCurve(t);
  const vipShare = 0.22;
  const vipArrivals = arrivals * vipShare;
  const rest = arrivals - vipArrivals;

  let admitBudget = arrivals * controls.admit;
  let admittedVip = 0;
  let admittedRest = 0;
  if (controls.vipFirst) {
    admittedVip = Math.min(vipArrivals, admitBudget);
    admitBudget -= admittedVip;
    admittedRest = Math.min(rest, admitBudget);
  } else {
    const ratio = arrivals === 0 ? 0 : admitBudget / arrivals;
    admittedVip = vipArrivals * ratio;
    admittedRest = rest * ratio;
  }
  const admitted = admittedVip + admittedRest;
  const shedNow = Math.max(0, arrivals - admitted);

  let queue = state.queue + admitted * dt;
  const drained = Math.min(queue, CAPACITY * dt);
  queue -= drained;
  const overflow = Math.max(0, queue - controls.queueCap);
  queue = Math.min(queue, controls.queueCap);

  const util = Math.min(1.4, (queue + drained) / (CAPACITY * 0.9));
  const p95 = 40 + util * util * 320 + overflow * 8;
  const timeoutFail = drained * Math.max(0, (p95 - P95_LIMIT_MS) / 400);
  const served = Math.max(0, drained - timeoutFail);
  const failed = timeoutFail + overflow + shedNow * dt * 0.15;

  const happyMs =
    state.happyMs + (p95 <= P95_LIMIT_MS ? served * 1000 : 0);

  let message = state.lastMessage;
  if (t > 11 && t < 15) message = "Surge arriving — shed or drown.";
  else if (p95 > P95_LIMIT_MS)
    message = "p95 above limit — queue is eating the shift.";
  else if (controls.admit < 0.55 && t > 14)
    message = "Hard shed — VIP survives, others get 503.";
  else if (queue > controls.queueCap * 0.8)
    message = "Queue near cap — overflow turns into errors.";
  else if (t > 28) message = "Traffic easing. Hold the line.";

  const next: SurgeState = {
    t,
    served: state.served + served,
    shed: state.shed + shedNow * dt,
    failed: state.failed + failed,
    queue,
    happyMs,
    lastMessage: message,
  };

  const totalDecided = next.served + next.shed + next.failed;
  const successRate =
    totalDecided === 0 ? 1 : next.served / Math.max(1, totalDecided);
  const snap: SurgeSnap = {
    t,
    arrivals,
    admitted,
    served: next.served,
    shed: next.shed,
    queue,
    p95,
    successRate,
    happyMs: next.happyMs,
    message,
  };

  if (t >= SURGE_DURATION_S) {
    const servedFrac =
      next.served / Math.max(1, next.served + next.shed + next.failed);
    const latencyOk = next.happyMs > 0 && p95 < P95_LIMIT_MS * 1.15;
    const won = servedFrac >= MIN_SERVED_RATE && latencyOk && successRate > 0.5;
    const score = Math.round(
      servedFrac * 400 +
        Math.max(0, P95_LIMIT_MS - p95) * 1.2 +
        (won ? 200 : 40) +
        (controls.vipFirst ? 30 : 0),
    );
    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "You shaped the surge — enough happy requests, p95 held."
          : servedFrac < MIN_SERVED_RATE
            ? "Too much shed — not enough customers made it through."
            : "Latency blew past the limit under the spike.",
        chapterHref: "/system-design/chapter-2",
        chapterLabel: "Ch.2 — Modeling requests, latency, and throughput",
        takeaway:
          "Shedding early protects the customers you can serve; serving everyone slowly serves no one.",
      },
    };
  }

  return { state: next, snap, done: null };
}
