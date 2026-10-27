/** Pure engine — Traffic Surge: admit/shed, dual queues, M/M/1-ish wait. */

export type SurgeControls = {
  /** Fraction of arrivals admitted (0–1). */
  admit: number;
  /** Soft queue cap — excess becomes 503. */
  queueCap: number;
  /** Prefer VIP traffic when shedding; VIP gets its own drain priority. */
  vipFirst: boolean;
};

export type SurgeSnap = {
  t: number;
  arrivals: number;
  admitted: number;
  served: number;
  shed: number;
  queue: number;
  vipQueue: number;
  p95: number;
  successRate: number;
  vipSuccessRate: number;
  /** Seconds spent with p95 under budget. */
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
};

export const SURGE_TICK_MS = 200;
export const SURGE_DURATION_S = 36;
export const P95_LIMIT_MS = 280;
export const MIN_SERVED_RATE = 0.55;
/** Service capacity (req/s) — player cannot add capacity, only shed. */
export const CAPACITY = 90;

export type SurgeState = {
  t: number;
  served: number;
  shed: number;
  failed: number;
  queue: number;
  vipQueue: number;
  vipServed: number;
  vipFailed: number;
  underBudgetSec: number;
  peakP95: number;
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
    vipQueue: 0,
    vipServed: 0,
    vipFailed: 0,
    underBudgetSec: 0,
    peakP95: 0,
    happyMs: 0,
    lastMessage: "Calm morning. Spike lands around 12s — decide who waits.",
  };
}

export function emptySurgeSnap(message?: string): SurgeSnap {
  return {
    t: 0,
    arrivals: 0,
    admitted: 0,
    served: 0,
    shed: 0,
    queue: 0,
    vipQueue: 0,
    p95: 0,
    successRate: 0,
    vipSuccessRate: 0,
    underBudgetSec: 0,
    happyMs: 0,
    message: message ?? "Idle — start a run to see the spike shape.",
  };
}

function arrivalCurve(t: number): number {
  if (t < 10) return 40 + Math.sin(t * 0.8) * 8;
  if (t < 14) return 40 + ((t - 10) / 4) * 160;
  if (t < 24) return 200 + Math.sin(t * 1.2) * 20;
  if (t < 28) return 200 - ((t - 24) / 4) * 120;
  return 70 + Math.sin(t) * 10;
}

/**
 * Approximate p95 from utilization via M/M/1 waiting-time intuition:
 * service ≈ 1000/μ ms; Wq ≈ ρ / (μ(1-ρ)) when ρ<1, else grows steeply.
 */
function latencyFromQueues(
  totalQueue: number,
  drained: number,
  dt: number,
  overflow: number,
): number {
  const mu = CAPACITY; // completions / s at full speed
  const rho = Math.min(0.98, Math.max(0.01, (drained / dt) / mu));
  const serviceMs = 1000 / mu; // ~11ms at μ=90
  const wqSec = rho / (mu * (1 - rho));
  const queuePenalty = (totalQueue / Math.max(1, CAPACITY)) * 90;
  const overflowPenalty = overflow * 10;
  const p95 =
    serviceMs * 8 + // base variability
    wqSec * 1000 * 2.2 +
    queuePenalty +
    overflowPenalty;
  return Math.max(25, p95);
}

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

  let vipQueue = state.vipQueue + admittedVip * dt;
  let queue = state.queue + admittedRest * dt;

  // Drain: VIP-first uses priority; otherwise fair share of capacity.
  let capLeft = CAPACITY * dt;
  let drainedVip = 0;
  let drainedRest = 0;
  if (controls.vipFirst) {
    drainedVip = Math.min(vipQueue, capLeft);
    vipQueue -= drainedVip;
    capLeft -= drainedVip;
    drainedRest = Math.min(queue, capLeft);
    queue -= drainedRest;
  } else {
    const totalQ = vipQueue + queue;
    if (totalQ > 0) {
      const vipFrac = vipQueue / totalQ;
      drainedVip = Math.min(vipQueue, capLeft * vipFrac);
      drainedRest = Math.min(queue, capLeft * (1 - vipFrac));
      vipQueue -= drainedVip;
      queue -= drainedRest;
    }
  }
  const drained = drainedVip + drainedRest;

  // VIP lane gets a reserved fraction of the cap so priority is visible.
  const vipCap = Math.max(12, controls.queueCap * 0.35);
  const overflowVip = Math.max(0, vipQueue - vipCap);
  const overflowRest = Math.max(0, queue - controls.queueCap);
  vipQueue = Math.min(vipQueue, vipCap);
  queue = Math.min(queue, controls.queueCap);
  const overflow = overflowVip + overflowRest;

  // Overall p95 for the shift (what operators watch on the shared edge).
  const p95 = latencyFromQueues(vipQueue + queue, drained, dt, overflow);

  // VIP-first: checkout latency follows the short priority lane, not the rest queue.
  // Without VIP-first, VIP shares the same timeout pressure as everyone else.
  const vipP95 = controls.vipFirst
    ? latencyFromQueues(vipQueue, drainedVip, dt, overflowVip)
    : p95;
  const restP95 = latencyFromQueues(queue, drainedRest, dt, overflowRest);
  const timeoutVip = drainedVip * Math.max(0, Math.min(0.85, (vipP95 - P95_LIMIT_MS) / 350));
  const timeoutRest = drainedRest * Math.max(0, Math.min(0.85, (restP95 - P95_LIMIT_MS) / 350));
  const servedVip = Math.max(0, drainedVip - timeoutVip);
  const servedRest = Math.max(0, drainedRest - timeoutRest);
  const served = servedVip + servedRest;

  // Shed is intentional 503 — tracked separately from timeouts/overflow.
  // VIP-first: shed lands on the rest; VIP failures are timeouts/overflow only.
  const vipShed = controls.vipFirst ? 0 : shedNow * dt * vipShare;
  const restShed = controls.vipFirst ? shedNow * dt : shedNow * dt * (1 - vipShare);
  const failed = timeoutVip + timeoutRest + overflow + vipShed * 0.05 + restShed * 0.05;

  const underBudgetSec =
    state.underBudgetSec + (p95 <= P95_LIMIT_MS ? dt : 0);
  const happyMs =
    state.happyMs + (p95 <= P95_LIMIT_MS ? served * 1000 : 0);
  const peakP95 = Math.max(state.peakP95, p95);

  let message = state.lastMessage;
  if (t > 11 && t < 15) message = "Surge arriving — shed or drown.";
  else if (p95 > P95_LIMIT_MS)
    message = `p95 ${p95.toFixed(0)}ms — queue depth is eating the shift.`;
  else if (controls.vipFirst && controls.admit < 0.7 && t > 14)
    message = "VIP priority drain — checkout lane kept short while rest sheds.";
  else if (controls.admit < 0.55 && t > 14)
    message = "Hard shed — intentional 503s protecting the customers you keep.";
  else if (queue + vipQueue > controls.queueCap * 0.8)
    message = "Queue near cap — overflow turns into errors.";
  else if (t > 28) message = "Traffic easing. Hold the line.";

  const next: SurgeState = {
    t,
    served: state.served + served,
    shed: state.shed + shedNow * dt,
    failed: state.failed + failed,
    queue,
    vipQueue,
    vipServed: state.vipServed + servedVip,
    vipFailed: state.vipFailed + timeoutVip + overflowVip + vipShed,
    underBudgetSec,
    peakP95,
    happyMs,
    lastMessage: message,
  };

  const totalDecided = next.served + next.shed + next.failed;
  const successRate =
    totalDecided === 0 ? 0 : next.served / Math.max(1, totalDecided);
  const vipTotal = next.vipServed + next.vipFailed;
  const vipSuccessRate =
    vipTotal === 0 ? 0 : next.vipServed / Math.max(1, vipTotal);

  const snap: SurgeSnap = {
    t,
    arrivals,
    admitted,
    served: next.served,
    shed: next.shed,
    queue: queue + vipQueue,
    vipQueue,
    p95,
    successRate,
    vipSuccessRate,
    underBudgetSec: next.underBudgetSec,
    happyMs: next.happyMs,
    message,
  };

  if (t >= SURGE_DURATION_S) {
    const servedFrac =
      next.served / Math.max(1, next.served + next.shed + next.failed);
    const budgetFrac = next.underBudgetSec / SURGE_DURATION_S;
    const latencyOk = budgetFrac >= 0.55 && next.peakP95 < P95_LIMIT_MS * 1.55;
    const vipOk = !controls.vipFirst || vipSuccessRate >= 0.72;
    const won =
      servedFrac >= MIN_SERVED_RATE && latencyOk && successRate > 0.48 && vipOk;
    const score = Math.round(
      servedFrac * 360 +
        budgetFrac * 220 +
        Math.max(0, P95_LIMIT_MS * 1.2 - next.peakP95) * 0.9 +
        (controls.vipFirst ? vipSuccessRate * 80 : 20) +
        (won ? 180 : 35),
    );
    const debrief = `Served ${(servedFrac * 100).toFixed(0)}% · under-budget ${(budgetFrac * 100).toFixed(0)}% of the run · peak p95 ${next.peakP95.toFixed(0)}ms · VIP success ${(vipSuccessRate * 100).toFixed(0)}%. Admit ${(controls.admit * 100).toFixed(0)}%, queue cap ${controls.queueCap}${controls.vipFirst ? ", VIP priority on" : ""}. Capacity fixed at ${CAPACITY} rps — shedding is the only lever past the cliff.`;

    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "You shaped the surge — enough happy requests, p95 held most of the run."
          : servedFrac < MIN_SERVED_RATE
            ? "Too much shed — not enough customers made it through."
            : !latencyOk
              ? "Latency spent too long over budget under the spike."
              : !vipOk
                ? "VIP lane still suffered — priority needs earlier shed on the rest."
                : "Success rate collapsed under the cliff.",
        chapterHref: "/system-design/chapter-2",
        chapterLabel: "Ch.2 — Modeling requests, latency, and throughput",
        takeaway:
          "Shedding early protects the customers you can serve; serving everyone slowly serves no one.",
        debrief,
      },
    };
  }

  return { state: next, snap, done: null };
}
