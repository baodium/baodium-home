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
      "Recommendation allows 40 connections. About 400 lookups a second at 70 ms use 28 of them. A burst of about 1.7 times that rate fills the rest.",
      "calm",
      "Pass when pending acquisitions finish at zero and acquire wait stays under 50 ms. The pool stays at 40.",
    );
  }
  const where =
    phase === "won"
      ? "The burst is over and the pool is clear."
      : phase === "lost"
        ? "Acquire wait is still the queue."
        : wave === 1
          ? "This is the 400 per second estimate."
          : "The burst is on.";
  const flag = flagOff ? " The flag is off for new calls." : ` Exposure is ${exposurePct.toFixed(0)} percent.`;
  const tone: DrillNarratorTone =
    phase === "won" ? "recover" : phase === "lost" || pending > 8 || errorBudget < 40 ? "warn" : "calm";
  return frame(
    `${where} ${arrivals.toFixed(0)} lookups a second are asking for a connection. The pool is ${Math.round(poolUtil * 100)} percent busy and ${pending.toFixed(0)} acquisitions are pending. Acquire headroom against the 600 ms incident is ${errorBudget.toFixed(0)} percent.${flag} The query stays at 70 ms.`,
    tone,
    "Good: pending near zero, acquire wait under 50 ms, and the query still near 70 ms.",
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
      "The load test walks 300, then 400, then 480, then 560 lookups a second, and it stops at the admission limit you set.",
      "calm",
      "Pass on the 400 per second stage: acquire p95 under 50 ms and rejections under 1 percent.",
    );
  }
  const tone: DrillNarratorTone =
    phase === "won" ? "recover" : phase === "lost" || p95 > p95Limit || reject >= 0.01 ? "warn" : "calm";
  return frame(
    `At ${t.toFixed(0)} seconds the stage is ${arrivals.toFixed(0)} lookups a second, inside a limit of ${limit.toFixed(0)}. Acquire p95 is ${p95.toFixed(0)} ms. Rejections are ${(reject * 100).toFixed(1)} percent.`,
    tone,
    `Pass: acquire p95 at or under ${p95Limit} ms, rejections under 1 percent, and the limit on the 400 per second stage.`,
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
      "Checkout calls the fraud provider with a child deadline. The provider should stop when that deadline is spent.",
      "calm",
      "Pass when leftover provider work is 0 ms and checkout returns inside the time it had left.",
    );
  }
  const tone: DrillNarratorTone = phase === "won" ? "recover" : phase === "lost" || orphanMs > 0 ? "warn" : "calm";
  const permitLine = permit ? "A permit was acquired." : "The permit is missing, so the call does not start.";
  const cancelLine = cancel ? "Cancellation is passed with the deadline." : "Cancellation is not passed, so the provider can keep running.";
  return frame(
    `The child deadline is ${childMs.toFixed(0)} ms. Checkout has used ${callerMs.toFixed(0)} ms. The provider is still running for ${orphanMs.toFixed(0)} ms. ${permitLine} ${cancelLine}`,
    tone,
    "Pass when the provider stops with the caller and the child deadline is the time checkout had left, minus the reserve, capped at 1000 ms.",
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
      "The key is product-metadata:v1. While it is fresh, Catalog is not called. A miss is what this drill runs.",
      "calm",
      "Pass when one missed key produces one catalog read and the source permit is present.",
    );
  }
  const tone: DrillNarratorTone = phase === "won" ? "recover" : phase === "lost" || origin > 1 ? "warn" : "calm";
  const how = fresh
    ? "The entry is fresh."
    : singleflight
      ? "The readers share one loader."
      : "Each reader loads the miss alone.";
  const permitLine = permit ? "The source permit is available." : "The source permit is missing.";
  return frame(
    `${readers} readers are on this key. Catalog reads are ${origin}. ${how} ${permitLine}`,
    tone,
    "Pass: one catalog read for the miss, and no source_read_limit responses.",
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
      "The query holds a connection for about 70 ms and stays there. Acquire p95 is what changes when the lookup rate changes.",
      "calm",
      `Pass: acquire p95 at or under ${budget} ms, which is the chapter's bar, at a rate the table marks as passing.`,
    );
  }
  const tone: DrillNarratorTone = phase === "won" ? "recover" : phase === "lost" || p95 > budget ? "warn" : "calm";
  return frame(
    `The query is ${queryMs.toFixed(0)} ms. Acquire p95 is ${p95.toFixed(0)} ms against a ${budget} ms bar. The pool is offered ${lookups.toFixed(0)} lookups a second.`,
    tone,
    `Pass: acquire p95 inside ${budget} ms while the query stays near 70 ms.`,
  );
}
