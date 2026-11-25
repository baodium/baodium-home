/** Cache Roulette. Chapter 5: one product-metadata miss, one shared loader, one source permit. */

export type CacheControls = {
  readers: number;
  fresh: boolean;
  singleflight: boolean;
  permit: boolean;
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
export const FILL_LATENCY_SEC = 0.3;
const TTL_SEC = 300;

export type CacheState = {
  t: number;
  hits: number;
  reads: number;
  peakOrigin: number;
  stampededSec: number;
};

export function createCache(): CacheState {
  return { t: 0, hits: 0, reads: 0, peakOrigin: 0, stampededSec: 0 };
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
    keyAge: 0,
    ttlSec: TTL_SEC,
    waitingOnFill: 0,
    stampededSec: 0,
    rps: 0,
    message: message ?? "The key is product-metadata:v1. A fresh entry returns from cache without calling Catalog.",
  };
}

export function tickCache(
  state: CacheState,
  controls: CacheControls,
  dt = CACHE_TICK_MS / 1000,
): { state: CacheState; snap: CacheSnap; done?: CacheResult } {
  const t = state.t + dt;
  const readers = Math.max(1, Math.round(controls.readers));
  const origin = controls.fresh ? 0 : !controls.permit ? 0 : controls.singleflight ? 1 : readers;
  const unavailable = controls.fresh || controls.permit ? 0 : readers;
  const stampeded = !controls.fresh && !controls.singleflight && controls.permit && origin >= 10;
  const hits = state.hits + (controls.fresh ? readers : 0) * dt;
  const reads = state.reads + readers * dt;
  const hitRate = reads > 0 ? hits / reads : controls.fresh ? 1 : 0;
  const originLoad = origin / Math.max(8, readers);
  const peakOrigin = Math.max(state.peakOrigin, origin);
  const stampededSec = state.stampededSec + (stampeded ? dt : 0);

  const message = controls.fresh
    ? "The entry is inside its 300 second TTL, so Catalog is not called."
    : !controls.permit
      ? "source_reads.try_acquire returned nothing. Readers receive TemporarilyUnavailable(source_read_limit) instead of a catalog query."
      : controls.singleflight
        ? "One shared loader fills product-metadata:v1, so Catalog sees a single read for the miss."
        : `${readers} readers each call catalog_db.fetch_metadata for the same missed key.`;

  const next: CacheState = { t, hits, reads, peakOrigin, stampededSec };
  const snap: CacheSnap = {
    t,
    hitRate,
    originLoad,
    peakOriginLoad: peakOrigin / Math.max(8, readers),
    inFlightMisses: origin,
    stampeded,
    filling: origin > 0,
    fillRemainingSec: origin > 0 ? FILL_LATENCY_SEC : 0,
    keyAge: controls.fresh ? 10 : TTL_SEC,
    ttlSec: TTL_SEC,
    waitingOnFill: unavailable,
    stampededSec,
    rps: readers,
    message,
  };

  if (t < CACHE_DURATION_S) return { state: next, snap };

  const won = !controls.fresh && controls.singleflight && controls.permit && origin === 1;
  const done: CacheResult = {
    outcome: won ? "won" : "lost",
    score: Math.round(won ? 100 : Math.max(0, 100 - origin)),
    reason: won
      ? "The missed key produced one catalog read. The waiters shared that loader, and the source-read permit was present."
      : controls.fresh
        ? "A fresh entry returns from cache without calling Catalog. This drill starts from the miss."
        : !controls.permit
          ? "Without a source-read permit the loader returns source_read_limit and Catalog stays idle."
          : `${origin} catalog reads came from one missed key. The listing shares one loader for every waiter on that key.`,
    chapterHref: "/system-design/chapter-5",
    chapterLabel: "Ch.5 · Caching",
    takeaway:
      "get_product_metadata is cache-aside with a 300 second TTL. On a miss, singleflight.run shares one loader, and that loader needs source_reads.try_acquire before it may read Catalog.",
    debrief: `Catalog reads ${origin}. Unavailable ${unavailable}. Readers ${readers}.`,
    before: "Each concurrent miss would call Catalog on its own.",
    after: won
      ? "Catalog saw one read for the missed key."
      : "Catalog did not see a single shared read for the miss.",
    changed: controls.singleflight
      ? "The readers shared one in-flight loader for the key."
      : "Each reader loaded the missed key alone.",
    metrics: [
      { label: "Catalog reads", value: `${origin}`, tone: origin === 1 ? "ok" : "bad" },
      { label: "Unavailable", value: `${unavailable}`, tone: unavailable === 0 ? "ok" : "warn" },
      { label: "Readers", value: `${readers}`, tone: "neutral" },
    ],
  };
  return { state: next, snap, done };
}
