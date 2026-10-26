/** Pure engine — Cache Roulette: hit/miss, TTL, stampede vs singleflight. */

export type CacheControls = {
  ttlSec: number;
  /** Coalesce concurrent misses on the same key. */
  singleflight: boolean;
  /** Serve stale while revalidating. */
  softTtl: boolean;
  /** Origin workers available. */
  originWorkers: number;
};

export type CacheSnap = {
  t: number;
  hitRate: number;
  originLoad: number;
  inFlightMisses: number;
  stampeded: boolean;
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
};

export const CACHE_TICK_MS = 200;
export const CACHE_DURATION_S = 34;
export const ORIGIN_SAFE = 1.0;

export type CacheState = {
  t: number;
  hits: number;
  misses: number;
  originBusy: number;
  keyAge: number;
  stampededTicks: number;
  lastMessage: string;
};

export function createCache(): CacheState {
  return {
    t: 0,
    hits: 0,
    misses: 0,
    originBusy: 0,
    keyAge: 4,
    stampededTicks: 0,
    lastMessage: "Warm cache. Keys expire — watch the herd.",
  };
}

export function tickCache(
  state: CacheState,
  controls: CacheControls,
  dt = CACHE_TICK_MS / 1000,
): { state: CacheState; snap: CacheSnap; done: CacheResult | null } {
  const t = state.t + dt;
  const rps = 120 + Math.sin(t * 0.7) * 25 + (t > 18 && t < 24 ? 80 : 0);

  let keyAge = state.keyAge + dt;
  const expired = keyAge >= controls.ttlSec;
  if (expired) keyAge = 0;

  let hits = state.hits;
  let misses = state.misses;
  let originBusy = Math.max(0, state.originBusy - controls.originWorkers * dt);
  let stampededTicks = state.stampededTicks;
  let inFlightMisses = 0;
  let stampeded = false;

  const softServe = expired && controls.softTtl;
  if (!expired || softServe) {
    hits += rps * dt * (softServe ? 0.85 : 1);
  }

  if (expired) {
    if (controls.singleflight) {
      inFlightMisses = 1;
      originBusy += 1.2 * dt;
      misses += 1 * dt;
      if (softServe) {
        // revalidate in background — mild load
      } else {
        // brief miss window for the leader only
        misses += rps * dt * 0.05;
      }
    } else {
      inFlightMisses = Math.round(rps * 0.35);
      originBusy += inFlightMisses * 0.08;
      misses += rps * dt;
      stampeded = originBusy > controls.originWorkers * 0.9;
      if (stampeded) stampededTicks += dt;
    }
  }

  const originLoad = originBusy / Math.max(1, controls.originWorkers);
  if (originLoad > 1.2) {
    // Origin saturation → more misses / timeouts counted as misses
    misses += rps * dt * 0.2;
  }

  const total = hits + misses;
  const hitRate = total === 0 ? 1 : hits / total;

  let message = state.lastMessage;
  if (expired && !controls.singleflight && stampeded)
    message = "Thundering herd — every client punched origin.";
  else if (expired && controls.singleflight && controls.softTtl)
    message = "Stale served; one revalidate in flight. Herd calm.";
  else if (expired && controls.singleflight)
    message = "Singleflight: one miss leader, others wait.";
  else if (controls.ttlSec < 3)
    message = "Tiny TTL — more expiry storms, more origin heat.";
  else if (t > 18 && t < 24) message = "Traffic bump on hot key.";
  else if (hitRate > 0.9) message = "Cache earning its keep.";

  const next: CacheState = {
    t,
    hits,
    misses,
    originBusy,
    keyAge,
    stampededTicks,
    lastMessage: message,
  };

  const snap: CacheSnap = {
    t,
    hitRate,
    originLoad: Math.min(2, originLoad),
    inFlightMisses,
    stampeded,
    rps,
    message,
  };

  if (t >= CACHE_DURATION_S) {
    const peakSafe = stampededTicks < 2.5 && originLoad < 1.35;
    const won = hitRate >= 0.72 && peakSafe;
    const score = Math.round(
      hitRate * 450 +
        Math.max(0, 120 - stampededTicks * 40) +
        (controls.singleflight ? 100 : 0) +
        (controls.softTtl ? 70 : 0) +
        (won ? 160 : 25),
    );
    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "Origin lived — coalesced misses beat the roulette wheel."
          : stampededTicks >= 2.5
            ? "Stampede won — TTL expiry became a thundering herd."
            : "Hit rate too low; cache spent more than it saved.",
        chapterHref: "/system-design/chapter-5",
        chapterLabel: "Ch.5 — Caching and the cost of remembering",
        takeaway:
          "Without request coalescing, a TTL expiry becomes an origin stampede.",
      },
    };
  }

  return { state: next, snap, done: null };
}
