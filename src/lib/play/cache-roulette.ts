/** Pure engine. Cache Roulette: TTL expiry, fill latency, stampede vs singleflight. */

export type CacheControls = {
  /** Key lifetime before expiry (seconds). */
  ttlSec: number;
  /** Coalesce concurrent misses on the same key into one origin fill. */
  singleflight: boolean;
  /** Serve stale while revalidating (SWR). */
  softTtl: boolean;
  /** Origin workers available to serve fills. */
  originWorkers: number;
};

export type CacheSnap = {
  t: number;
  hitRate: number;
  originLoad: number;
  peakOriginLoad: number;
  inFlightMisses: number;
  stampeded: boolean;
  filling: boolean;
  fillRemainingSec: number;
  /** Age of the hot key toward TTL. */
  keyAge: number;
  ttlSec: number;
  waitingOnFill: number;
  stampededSec: number;
  rps: number;
  message: string;
};

export type CacheResult = {
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

export const CACHE_TICK_MS = 200;
export const CACHE_DURATION_S = 34;
/** Origin fill latency for a cold key (seconds). */
export const FILL_LATENCY_SEC = 1.4;

export type CacheState = {
  t: number;
  hits: number;
  misses: number;
  /** Work queued / in progress at origin (worker-seconds). */
  originBusy: number;
  /** Age of the warm key; resets when a fill completes. */
  keyAge: number;
  /** True while origin is refilling after expiry. */
  filling: boolean;
  fillRemaining: number;
  /** Misses coalesced onto the in-flight fill (singleflight waiters). */
  waitingOnFill: number;
  stampededSec: number;
  peakOriginLoad: number;
  lastMessage: string;
};

export function createCache(): CacheState {
  return {
    t: 0,
    hits: 0,
    misses: 0,
    originBusy: 0,
    keyAge: 4,
    filling: false,
    fillRemaining: 0,
    waitingOnFill: 0,
    stampededSec: 0,
    peakOriginLoad: 0,
    lastMessage: "Warm cache. Keys expire on a TTL. Watch origin when they do.",
  };
}

export function emptyCacheSnap(message?: string): CacheSnap {
  return {
    t: 0,
    hitRate: 0,
    originLoad: 0,
    peakOriginLoad: 0,
    inFlightMisses: 0,
    stampeded: false,
    filling: false,
    fillRemainingSec: 0,
    keyAge: 4,
    ttlSec: 6,
    waitingOnFill: 0,
    stampededSec: 0,
    rps: 0,
    message: message ?? "Idle. Start a run to see hit rate and origin load.",
  };
}

function arrivalRps(t: number): number {
  // Steady hot-key traffic with a mid-run bump.
  return 120 + Math.sin(t * 0.7) * 25 + (t > 18 && t < 24 ? 80 : 0);
}

export function tickCache(
  state: CacheState,
  controls: CacheControls,
  dt = CACHE_TICK_MS / 1000,
): { state: CacheState; snap: CacheSnap; done: CacheResult | null } {
  const t = state.t + dt;
  const rps = arrivalRps(t);
  const ttl = Math.max(0.8, controls.ttlSec);
  const workers = Math.max(1, controls.originWorkers);

  let keyAge = state.keyAge;
  let filling = state.filling;
  let fillRemaining = state.fillRemaining;
  let waitingOnFill = state.waitingOnFill;
  let hits = state.hits;
  let misses = state.misses;
  let originBusy = Math.max(0, state.originBusy - workers * dt);
  let stampededSec = state.stampededSec;
  let peakOriginLoad = state.peakOriginLoad;

  // Advance key age only while warm (not mid-fill).
  if (!filling) {
    keyAge += dt;
  }

  const justExpired = !filling && keyAge >= ttl;
  if (justExpired) {
    filling = true;
    // Fill time grows slightly when origin is already hot.
    const heat = Math.min(1.5, originBusy / workers);
    fillRemaining = FILL_LATENCY_SEC * (1 + 0.35 * heat);
    waitingOnFill = 0;
    keyAge = ttl; // mark expired until fill completes
  }

  let inFlightMisses = 0;
  let stampeded = false;

  if (filling) {
    if (controls.softTtl) {
      // Stale-while-revalidate: clients still get hits; one (or a herd) revalidates.
      hits += rps * dt;
    }

    if (controls.singleflight) {
      // One leader fills; others wait on the same future without punching origin.
      inFlightMisses = 1 + waitingOnFill;
      waitingOnFill = Math.min(rps * 2, waitingOnFill + rps * dt * 0.15);
      originBusy += 1.0 * dt; // one fill job
      if (!controls.softTtl) {
        // Waiters block → counted as brief misses until fill lands.
        misses += Math.min(rps, 1 + waitingOnFill * 0.05) * dt;
      } else {
        misses += 1 * dt; // revalidation miss only
      }
    } else {
      // Thundering herd: every arrival during fill hits origin.
      inFlightMisses = Math.round(rps);
      const herd = rps * dt;
      misses += herd;
      // Each miss costs ~fillRemaining worth of origin work, amortized.
      originBusy += herd * Math.min(0.25, fillRemaining * 0.35);
      stampeded = originBusy > workers * 0.85;
      if (stampeded) stampededSec += dt;
    }

    fillRemaining -= dt;
    if (fillRemaining <= 0) {
      filling = false;
      fillRemaining = 0;
      waitingOnFill = 0;
      keyAge = 0; // warm again
      // Completing the fill frees some origin backlog.
      originBusy = Math.max(0, originBusy - workers * 0.4);
    }
  } else {
    // Warm cache. full hits.
    hits += rps * dt;
  }

  const originLoad = originBusy / workers;
  peakOriginLoad = Math.max(peakOriginLoad, originLoad);

  // Origin saturation → timeouts counted as extra misses.
  if (originLoad > 1.15) {
    misses += rps * dt * Math.min(0.45, (originLoad - 1.15) * 0.5);
  }

  const total = hits + misses;
  const hitRate = total <= 1e-9 ? 1 : hits / total;

  let message = state.lastMessage;
  if (filling && !controls.singleflight && stampeded) {
    message = `Herd on origin. ~${inFlightMisses} concurrent misses while key refills (${fillRemaining.toFixed(1)}s left).`;
  } else if (filling && controls.singleflight && controls.softTtl) {
    message = "Stale served; one revalidate in flight. Herd calm.";
  } else if (filling && controls.singleflight) {
    message = "Singleflight: one miss leader, others wait on the same fill.";
  } else if (ttl < 3) {
    message = "Tiny TTL. Expiry storms every few seconds; origin never cools.";
  } else if (t > 18 && t < 24) {
    message = "Traffic bump on the hot key. Expiry here hurts more.";
  } else if (hitRate > 0.92 && !filling) {
    message = "Cache earning its keep. Watch the next TTL edge.";
  }

  const next: CacheState = {
    t,
    hits,
    misses,
    originBusy,
    keyAge,
    filling,
    fillRemaining: Math.max(0, fillRemaining),
    waitingOnFill,
    stampededSec,
    peakOriginLoad,
    lastMessage: message,
  };

  const snap: CacheSnap = {
    t,
    hitRate,
    originLoad: Math.min(2.5, originLoad),
    peakOriginLoad: Math.min(2.5, peakOriginLoad),
    inFlightMisses,
    stampeded,
    filling,
    fillRemainingSec: Math.max(0, fillRemaining),
    keyAge,
    ttlSec: ttl,
    waitingOnFill,
    stampededSec,
    rps,
    message,
  };

  if (t >= CACHE_DURATION_S) {
    const peakSafe = stampededSec < 2.2 && peakOriginLoad < 1.45;
    const won = hitRate >= 0.7 && peakSafe;
    const score = Math.round(
      hitRate * 420 +
        Math.max(0, 140 - stampededSec * 45) +
        Math.max(0, 100 - peakOriginLoad * 55) +
        (controls.singleflight ? 90 : 0) +
        (controls.softTtl ? 60 : 0) +
        (won ? 150 : 20),
    );
    const debrief = won
      ? `Hit rate ${(hitRate * 100).toFixed(0)}%, peak origin ${peakOriginLoad.toFixed(2)}×, stampede ${stampededSec.toFixed(1)}s. ${controls.singleflight ? "Singleflight kept fill concurrency ≈ 1." : "You got lucky. Try without singleflight and compare peak load."} ${controls.softTtl ? "SWR hid the miss window from clients." : "Without SWR, waiters felt the fill."}`
      : `Hit rate ${(hitRate * 100).toFixed(0)}%, peak origin ${peakOriginLoad.toFixed(2)}×, stampede ${stampededSec.toFixed(1)}s. TTL=${ttl.toFixed(1)}s, workers=${workers}. ${!controls.singleflight ? "Without coalescing, every expiry multiplies origin work by RPS×fill_latency." : "Singleflight was on but origin still overheated. Raise workers or TTL, or enable SWR."}`;

    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "Origin lived. Coalesced fills beat the roulette wheel."
          : stampededSec >= 2.2
            ? "Stampede won. TTL expiry became a thundering herd."
            : peakOriginLoad >= 1.45
              ? "Origin peaked over capacity during a fill window."
              : "Hit rate too low; cache spent more than it saved.",
        chapterHref: "/system-design/chapter-5",
        chapterLabel: "Ch.5. Caching and the cost of remembering",
        takeaway:
          "Without request coalescing, a TTL expiry becomes an origin stampede that lasts the whole fill. Not one tick.",
        debrief,
        before:
          "Popular keys share one TTL. When it fires, every waiter can hit origin for the whole fill window.",
        after: `Hit rate ${(hitRate * 100).toFixed(0)}%, peak origin ${peakOriginLoad.toFixed(2)}×, stampede ${stampededSec.toFixed(1)}s (TTL ${ttl.toFixed(1)}s, workers ${workers}${controls.singleflight ? ", singleflight" : ""}${controls.softTtl ? ", SWR" : ""}).`,
        changed: controls.singleflight && won
          ? "Singleflight collapsed concurrent misses into one fill. Origin load stayed near 1× during expiry."
          : !controls.singleflight && stampededSec >= 1
            ? "Without coalescing, expiry multiplied origin work by RPS × fill latency for the stampede window."
            : "Soft TTL / workers alone cannot replace coalescing when many clients miss the same key together.",
        metrics: [
          {
            label: "Hit rate",
            value: `${(hitRate * 100).toFixed(0)}%`,
            tone: hitRate >= 0.7 ? "ok" : hitRate >= 0.55 ? "warn" : "bad",
          },
          {
            label: "Peak origin",
            value: `${peakOriginLoad.toFixed(2)}×`,
            tone: peakOriginLoad < 1.2 ? "ok" : peakOriginLoad < 1.45 ? "warn" : "bad",
          },
          {
            label: "Stampede",
            value: `${stampededSec.toFixed(1)}s`,
            tone: stampededSec < 1 ? "ok" : stampededSec < 2.2 ? "warn" : "bad",
          },
          {
            label: "Coalesce",
            value: controls.singleflight ? "on" : "off",
            tone: controls.singleflight ? "ok" : "bad",
          },
        ],
      },
    };
  }

  return { state: next, snap, done: null };
}
