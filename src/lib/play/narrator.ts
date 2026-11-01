/** Shared live plain-English state chains for Play drills. */

export type DrillNarratorTone = "calm" | "warn" | "recover";

export type DrillNarratorFrame = {
  chain: string;
  segments: string[];
  tone: DrillNarratorTone;
  /** What “good” looks like for the current meters. */
  goodLooksLike: string;
};

function frame(
  sentence: string,
  tone: DrillNarratorTone,
  goodLooksLike: string,
): DrillNarratorFrame {
  return { chain: sentence, segments: [sentence], tone, goodLooksLike };
}

export function narrateSloWatch(input: {
  phase: string;
  wave: number;
  poolUtil: number;
  pending: number;
  arrivals: number;
  successRate: number;
  errorBudget: number;
  retries: string;
  shedding: boolean;
  sloTarget: number;
}): DrillNarratorFrame {
  const {
    phase,
    wave,
    poolUtil,
    pending,
    arrivals,
    successRate,
    errorBudget,
    retries,
    shedding,
    sloTarget,
  } = input;

  if (phase === "intro") {
    return frame(
      "The shift has not started. Three arrival waves will hit checkout. Watch the error budget and the pool together.",
      "calm",
      `Pass: success ≥ ${(sloTarget * 100).toFixed(1)}% with budget left, no cascade, peak util under 120%.`,
    );
  }

  const where =
    phase === "won" ? "The shift held." : phase === "lost" ? "The error budget is gone." : `Wave ${wave} is in progress.`;
  const queue =
    pending > 0
      ? `${pending.toFixed(0)} requests are waiting for a connection.`
      : "Nobody is waiting for a connection.";
  const shed = shedding ? " Load shedding is on." : "";
  let tone: DrillNarratorTone = "calm";
  if (phase === "won") tone = "recover";
  else if (phase === "lost" || errorBudget < 25 || poolUtil > 0.95) tone = "warn";
  else if (poolUtil > 0.85 || pending > 8) tone = "warn";

  return frame(
    `${where} The pool is ${Math.round(poolUtil * 100)}% busy. ${queue} About ${arrivals.toFixed(0)} arrivals per second are coming in, with retries set to ${retries}. Success is ${(successRate * 100).toFixed(1)}%, and ${errorBudget.toFixed(0)}% of the error budget is left.${shed}`,
    tone,
    `Good: pool under about 85%, pending near 0, success at least ${(sloTarget * 100).toFixed(1)}%, and the budget not draining.`,
  );
}

export function narrateTrafficSurge(input: {
  phase: string;
  t: number;
  admit: number;
  queue: number;
  vipQueue: number;
  p95: number;
  p95Limit: number;
  successRate: number;
  shed: number;
  vipFirst: boolean;
}): DrillNarratorFrame {
  const {
    phase,
    t,
    admit,
    queue,
    vipQueue,
    p95,
    p95Limit,
    successRate,
    shed,
    vipFirst,
  } = input;

  if (phase === "intro") {
    return frame(
      "It is a quiet morning on a service with fixed capacity. A spike lands around 12 seconds. Queue depth and p95 are what you watch.",
      "calm",
      `Good: p95 under ${p95Limit} ms while still serving most of the floor.`,
    );
  }

  const vip = vipFirst ? ` ${vipQueue.toFixed(0)} of them are in the VIP lane.` : "";
  const shedLine = shed > 0 ? ` ${shed.toFixed(0)} arrivals have been turned away.` : "";
  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || p95 > p95Limit
        ? "warn"
        : queue > 40
          ? "warn"
          : "calm";

  return frame(
    `At ${t.toFixed(0)} seconds, ${Math.round(admit * 100)}% of arrivals are admitted. ${queue.toFixed(0)} requests are waiting.${vip} p95 is ${p95.toFixed(0)} ms against a ${p95Limit} ms budget. Success is ${(successRate * 100).toFixed(0)}%.${shedLine}`,
    tone,
    `Pass: p95 at or under ${p95Limit} ms for most of the run, a useful share served, and the VIP lane protected if priority is on.`,
  );
}

export function narrateCascade(input: {
  phase: string;
  edgeHealth: number;
  authHealth: number;
  dbHealth: number;
  payHealth: number;
  circuitsOpen: number;
  bulkheadAuth: boolean;
  bulkheadPay: boolean;
  cascadeRisk: number;
}): DrillNarratorFrame {
  const {
    phase,
    edgeHealth,
    authHealth,
    dbHealth,
    payHealth,
    circuitsOpen,
    bulkheadAuth,
    bulkheadPay,
    cascadeRisk,
  } = input;

  if (phase === "intro") {
    return frame(
      "Checkout is healthy. A dependency will slow down and hold shared workers. Watch which service loses health, and whether the edge falls with it.",
      "calm",
      "Pass when checkout stays at or above 60 percent, edge health stays above 42 percent, and cascade risk stays under 82 percent.",
    );
  }

  const circuits =
    circuitsOpen > 0
      ? `${circuitsOpen} breaker${circuitsOpen === 1 ? " is" : "s are"} open, so those calls fail fast.`
      : "Every breaker is still closed.";
  const walls = [
    bulkheadAuth ? "Auth has its own workers" : null,
    bulkheadPay ? "Pay and the database have their own workers" : null,
  ].filter(Boolean);
  const budget = walls.length > 0 ? walls.join(", and ") + "." : "Auth, Pay, and the database still share one worker pool.";
  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || edgeHealth < 0.55 || cascadeRisk > 0.7
        ? "warn"
        : authHealth < 0.7 || dbHealth < 0.7 || payHealth < 0.7
          ? "warn"
          : "calm";

  return frame(
    `Edge health is ${Math.round(edgeHealth * 100)}%. Auth is ${Math.round(authHealth * 100)}%, Pay is ${Math.round(payHealth * 100)}%, and the database is ${Math.round(dbHealth * 100)}%. ${circuits} ${budget} Cascade risk is ${Math.round(cascadeRisk * 100)}%.`,
    tone,
    "Pass when checkout stays at or above 60 percent, edge health stays above 42 percent, and cascade risk stays under 82 percent. There is no path that skips Auth.",
  );
}

export function narrateCacheRoulette(input: {
  phase: string;
  hitRate: number;
  originLoad: number;
  originWorkers: number;
  singleflight: boolean;
  softTtl: boolean;
  ttlSec: number;
  stampeded: boolean;
  inFlightMisses: number;
}): DrillNarratorFrame {
  const {
    phase,
    hitRate,
    originLoad,
    originWorkers,
    singleflight,
    softTtl,
    ttlSec,
    stampeded,
    inFlightMisses,
  } = input;

  if (phase === "intro") {
    return frame(
      `Keys stay fresh for ${ttlSec} seconds. When a popular key expires, watch how many fills reach origin at once.`,
      "calm",
      "Pass: hit rate at least 70%, stampede under 2.2 seconds, peak origin under 1.45 times capacity.",
    );
  }

  const coalesce = singleflight
    ? "Misses for the same key share one fill."
    : "Each miss fills from origin on its own.";
  const swr = softTtl ? " A slightly stale value is still being served during refresh." : "";
  const misses = inFlightMisses > 0 ? ` ${inFlightMisses} fills are in flight.` : "";
  const herd = stampeded ? " This is the stampede window." : "";
  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || stampeded || originLoad > 1
        ? "warn"
        : "calm";

  return frame(
    `Hit rate is ${(hitRate * 100).toFixed(0)}%. Origin is using ${(originLoad * 100).toFixed(0)}% of ${originWorkers} workers. ${coalesce}${swr}${misses}${herd}`,
    tone,
    "Pass: hit rate recovers after each expiry, and origin stays under capacity during the fill.",
  );
}

export function narrateTailLatency(input: {
  phase: string;
  p50: number;
  p99: number;
  budget: number;
  hedge: boolean;
  hedgeAfterMs: number;
  workers: number;
  queueDepth: number;
  cost: number;
}): DrillNarratorFrame {
  const {
    phase,
    p50,
    p99,
    budget,
    hedge,
    hedgeAfterMs,
    workers,
    queueDepth,
    cost,
  } = input;

  if (phase === "intro") {
    return frame(
      "The latency window is still filling. Stragglers show up after about 10 seconds. Compare the median with the slowest 1 percent.",
      "calm",
      `Pass: p99 at or under ${budget} ms, goodput at least 90%, work cost under 1.8 times, and at least 40 samples.`,
    );
  }

  const spread = Math.max(0, p99 - p50);
  const hedgeLine = hedge
    ? `A second copy goes out if a request is still running after ${hedgeAfterMs} ms.`
    : "Late requests do not get a second copy.";
  const costLine = cost > 1.15 ? ` Work cost is ${cost.toFixed(2)} times a single try.` : "";
  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || p99 > budget
        ? "warn"
        : spread > 80
          ? "warn"
          : "calm";

  return frame(
    `The median is ${p50.toFixed(0)} ms and the slowest 1 percent is ${p99.toFixed(0)} ms, against a ${budget} ms budget. The spread is ${spread.toFixed(0)} ms. ${hedgeLine} ${workers} workers are on shift and ${queueDepth.toFixed(0)} requests are queued.${costLine}`,
    tone,
    `Pass: p99 inside ${budget} ms, goodput holds, and extra copies keep work cost under 1.8 times.`,
  );
}
