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
  segments: string[],
  tone: DrillNarratorTone,
  goodLooksLike: string,
): DrillNarratorFrame {
  return { chain: segments.join(" → "), segments, tone, goodLooksLike };
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
      ["Shift armed", "three waves ahead", "defaults will not hold Wave 3"],
      "calm",
      `Good: success ≥ ${(sloTarget * 100).toFixed(1)}% with budget left when the clock ends.`,
    );
  }

  const segments: string[] = [
    phase === "won" ? "Shift held" : phase === "lost" ? "Budget empty" : `Wave ${wave}`,
    `pool ${Math.round(poolUtil * 100)}% util`,
  ];
  if (pending > 0) segments.push(`${pending.toFixed(0)} pending for a connection`);
  segments.push(`~${arrivals.toFixed(0)} arrivals/s (${retries} retries)`);
  segments.push(
    `success ${(successRate * 100).toFixed(2)}% · budget ${errorBudget.toFixed(0)}%`,
  );
  if (shedding) segments.push("shedding on");

  let tone: DrillNarratorTone = "calm";
  if (phase === "won") tone = "recover";
  else if (phase === "lost" || errorBudget < 25 || poolUtil > 0.95) tone = "warn";
  else if (poolUtil > 0.85 || pending > 8) tone = "warn";

  return frame(
    segments,
    tone,
    `Good: pool under ~85%, pending near 0, success ≥ ${(sloTarget * 100).toFixed(1)}%, budget not draining.`,
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
      ["Calm morning", "spike lands ~12s", "decide who waits"],
      "calm",
      `Good: p95 under ${p95Limit} ms while still serving most of the floor.`,
    );
  }

  const segments = [
    `t=${t.toFixed(0)}s`,
    `admit ${Math.round(admit * 100)}%`,
    `queue ${queue.toFixed(0)}${vipFirst ? ` · VIP ${vipQueue.toFixed(0)}` : ""}`,
    `p95 ${p95.toFixed(0)} ms (budget ${p95Limit})`,
    `success ${(successRate * 100).toFixed(0)}%`,
  ];
  if (shed > 0) segments.push(`${shed.toFixed(0)} shed`);

  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || p95 > p95Limit
        ? "warn"
        : queue > 40
          ? "warn"
          : "calm";

  return frame(
    segments,
    tone,
    `Good: p95 ≤ ${p95Limit} ms, queue not climbing, success stays useful — shed early rather than serve everyone slowly.`,
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
      ["Checkout healthy", "Auth and DB will wobble", "isolate before the blast spreads"],
      "calm",
      "Good: checkout stays up while a dependency fails — circuit + bulkhead both landed.",
    );
  }

  const segments = [
    `edge ${Math.round(edgeHealth * 100)}%`,
    `auth ${Math.round(authHealth * 100)}%`,
    `pay ${Math.round(payHealth * 100)}%`,
    `db ${Math.round(dbHealth * 100)}%`,
    circuitsOpen > 0 ? `${circuitsOpen} circuit${circuitsOpen === 1 ? "" : "s"} open` : "circuits closed",
    `bulkheads ${[bulkheadAuth && "auth", bulkheadPay && "pay/db"].filter(Boolean).join("+") || "off"}`,
  ];
  if (cascadeRisk > 0.35) {
    segments.push(`cascade risk ${Math.round(cascadeRisk * 100)}%`);
  }

  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || edgeHealth < 0.55 || cascadeRisk > 0.7
        ? "warn"
        : authHealth < 0.7 || dbHealth < 0.7 || payHealth < 0.7
          ? "warn"
          : "calm";

  return frame(
    segments,
    tone,
    "Good: failing dependency is isolated — edge health holds while auth/pay/db recover behind a circuit and bulkhead.",
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
      [`TTL ${ttlSec}s`, "keys will expire together", "coalesce misses or stampede origin"],
      "calm",
      `Good: hit rate stays high and origin stays under ~${originWorkers} workers through expiry edges.`,
    );
  }

  const segments = [
    `hit ${(hitRate * 100).toFixed(0)}%`,
    `origin ${(originLoad * 100).toFixed(0)}% of ${originWorkers} workers`,
    singleflight ? "singleflight on" : "singleflight off",
  ];
  if (softTtl) segments.push("SWR on");
  if (inFlightMisses > 0) segments.push(`${inFlightMisses} in-flight misses`);
  if (stampeded) segments.push("stampede window");

  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || stampeded || originLoad > 1
        ? "warn"
        : "calm";

  return frame(
    segments,
    tone,
    "Good: one refresh per key (singleflight), origin under capacity, hit rate recovers after each TTL edge.",
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
      ["p50 looks fine", "stragglers arrive ~10s", "hedge carefully"],
      "calm",
      `Good: p99 ≤ ${budget} ms without work-cost runaway from hedge copies.`,
    );
  }

  const spread = Math.max(0, p99 - p50);
  const segments = [
    `p50 ${p50.toFixed(0)} ms`,
    `p99 ${p99.toFixed(0)} ms (budget ${budget})`,
    `spread ${spread.toFixed(0)} ms`,
    hedge ? `hedge after ${hedgeAfterMs} ms` : "hedge off",
    `${workers} workers · queue ${queueDepth.toFixed(0)}`,
  ];
  if (cost > 1.15) segments.push(`work cost ${cost.toFixed(2)}×`);

  const tone: DrillNarratorTone =
    phase === "won"
      ? "recover"
      : phase === "lost" || p99 > budget
        ? "warn"
        : spread > 80
          ? "warn"
          : "calm";

  return frame(
    segments,
    tone,
    `Good: p99 inside ${budget} ms, spread not exploding, hedge copies fit in spare capacity.`,
  );
}
