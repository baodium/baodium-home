/** Live sentences for the Play drills. */

export type DrillNarratorTone = "calm" | "warn" | "recover";

export type DrillNarratorFrame = {
  chain: string;
  segments: string[];
  tone: DrillNarratorTone;
  goodLooksLike: string;
};

function frame(sentence: string, tone: DrillNarratorTone, goodLooksLike: string): DrillNarratorFrame {
  return { chain: sentence, segments: [sentence], tone, goodLooksLike };
}

export function narrateSloWatch(input: {
  phase: string;
  wave: number;
  poolUtil: number;
  pending: number;
  arrivals: number;
  errorBudget: number;
  flagOff: boolean;
  exposurePct: number;
}): DrillNarratorFrame {
  const { phase, wave, poolUtil, pending, arrivals, errorBudget, flagOff, exposurePct } = input;
  if (phase === "intro") {
    return frame(
      "Recommendation Service allows 40 database connections. At about 400 lookups a second with a 70 ms hold, Little's Law puts roughly 28 connections in use, which leaves a thin margin before a burst fills the rest.",
      "calm",
      "Finish with pending acquisitions at zero and acquire wait under 50 ms. The pool size stays at 40.",
    );
  }
  const where =
    phase === "won"
      ? "The burst has ended and the pool is clear."
      : phase === "lost"
        ? "Acquire wait is still measuring the queue for a free connection."
        : wave === 1
          ? "This stage matches the chapter estimate of 400 lookups a second."
          : "The burst stage is active.";
  const flag = flagOff
    ? " The feature flag is off for new recommendation calls."
    : ` Exposure is ${exposurePct.toFixed(0)} percent of product-page traffic.`;
  const tone: DrillNarratorTone =
    phase === "won" ? "recover" : phase === "lost" || pending > 8 || errorBudget < 40 ? "warn" : "calm";
  return frame(
    `${where} ${arrivals.toFixed(0)} lookups a second are asking for a connection. The pool is ${Math.round(poolUtil * 100)} percent busy, with ${pending.toFixed(0)} acquisitions pending. Acquire headroom against the 600 ms incident line is ${errorBudget.toFixed(0)} percent.${flag} The query hold stays at 70 ms.`,
    tone,
    "Pending near zero, acquire wait under 50 ms, and the query still near 70 ms.",
  );
}

export function narrateTrafficSurge(input: {
  phase: string;
  t: number;
  arrivals: number;
  p95: number;
  p95Limit: number;
  reject: number;
  limit: number;
}): DrillNarratorFrame {
  const { phase, t, arrivals, p95, p95Limit, reject, limit } = input;
  if (phase === "intro") {
    return frame(
      "The chapter load test walks 300, then 400, then 480, then 560 lookups a second, and stops at the admission limit you set.",
      "calm",
      "Keep the limit on the 400 per second stage so acquire p95 stays under 50 ms and rejections stay under 1 percent.",
    );
  }
  const tone: DrillNarratorTone =
    phase === "won" ? "recover" : phase === "lost" || p95 > p95Limit || reject >= 0.01 ? "warn" : "calm";
  return frame(
    `At ${t.toFixed(0)} seconds the stage is ${arrivals.toFixed(0)} lookups a second, inside an admission limit of ${limit.toFixed(0)}. Acquire p95 is ${p95.toFixed(0)} ms, and rejections are ${(reject * 100).toFixed(1)} percent.`,
    tone,
    `Acquire p95 at or under ${p95Limit} ms, rejections under 1 percent, and the admission limit on the 400 per second stage.`,
  );
}

export function narrateCascade(input: {
  phase: string;
  callerMs: number;
  orphanMs: number;
  childMs: number;
  cancel: boolean;
  permit: boolean;
}): DrillNarratorFrame {
  const { phase, callerMs, orphanMs, childMs, cancel, permit } = input;
  if (phase === "intro") {
    return frame(
      "Checkout calls Fraud Service with a child deadline cut from the time left after the reserve, capped at 1000 ms. When the provider is slower than that deadline, leftover work continues unless cancellation travels with the call.",
      "calm",
      "Leftover provider work at 0 ms, and checkout returns inside the time it had left.",
    );
  }
  const tone: DrillNarratorTone = phase === "won" ? "recover" : phase === "lost" || orphanMs > 0 ? "warn" : "calm";
  const permitLine = permit
    ? "An outbound permit was acquired."
    : "The outbound permit is missing, so the provider call never starts.";
  const cancelLine = cancel
    ? "Cancellation is passed with the deadline."
    : "Cancellation is not passed, so the provider can keep running after checkout returns.";
  return frame(
    `The child deadline is ${childMs.toFixed(0)} ms. Checkout has used ${callerMs.toFixed(0)} ms. The provider is still running for ${orphanMs.toFixed(0)} ms. ${permitLine} ${cancelLine}`,
    tone,
    "The provider stops with the caller. The child deadline is the time checkout had left, minus the reserve, capped at 1000 ms.",
  );
}

export function narrateCacheRoulette(input: {
  phase: string;
  readers: number;
  origin: number;
  fresh: boolean;
  singleflight: boolean;
  permit: boolean;
}): DrillNarratorFrame {
  const { phase, readers, origin, fresh, singleflight, permit } = input;
  if (phase === "intro") {
    return frame(
      "product-metadata:v1 is a cache-aside entry with a 300 second TTL. While the entry is fresh, Catalog is not called. On a miss, every concurrent reader would call Catalog unless they share one loader.",
      "calm",
      "One catalog read for the missed key, with the source permit present and unavailable responses at zero.",
    );
  }
  const tone: DrillNarratorTone = phase === "won" ? "recover" : phase === "lost" || origin > 1 ? "warn" : "calm";
  const how = fresh
    ? "The entry is still inside its TTL."
    : singleflight
      ? "The readers share one in-flight loader."
      : "Each reader loads the missed key alone.";
  const permitLine = permit
    ? "The source-read permit is available."
    : "The source-read permit is missing, so readers receive source_read_limit.";
  return frame(
    `${readers} readers are on this key. Catalog reads are ${origin}. ${how} ${permitLine}`,
    tone,
    "One catalog read for the miss, and no source_read_limit responses.",
  );
}

export function narrateTailLatency(input: {
  phase: string;
  queryMs: number;
  p95: number;
  budget: number;
  lookups: number;
}): DrillNarratorFrame {
  const { phase, queryMs, p95, budget, lookups } = input;
  if (phase === "intro") {
    return frame(
      "The recommendation query holds a connection for about 70 ms for the whole run. What changes with the offered lookup rate is how long a lookup waits to acquire a connection from the pool of 40.",
      "calm",
      `Acquire p95 at or under ${budget} ms at a lookup rate the load-test table marks as passing.`,
    );
  }
  const tone: DrillNarratorTone = phase === "won" ? "recover" : phase === "lost" || p95 > budget ? "warn" : "calm";
  return frame(
    `The query hold is ${queryMs.toFixed(0)} ms. Acquire p95 is ${p95.toFixed(0)} ms against the ${budget} ms bar. The pool is offered ${lookups.toFixed(0)} lookups a second.`,
    tone,
    `Acquire p95 inside ${budget} ms while the query stays near 70 ms.`,
  );
}
