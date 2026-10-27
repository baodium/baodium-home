import { createRng, isUserExposed, type Rng } from "@/lib/experience/rng";
import { littlesLaw } from "@/lib/experience/littles";
import type {
  EngineControls,
  EngineSnapshot,
  FlagLogEntry,
  LatencySample,
  PathLatency,
  SimRequest,
  SlotState,
} from "@/lib/experience/types";

export const POOL_SIZE = 40;
/** Fine tick so short baseline holds (~12ms) are not quantized to 50ms. */
export const DEFAULT_TICK_SEC = 0.01;
/** Rolling window for throughput / recent stats (sim seconds). */
export const METRIC_WINDOW_SEC = 5;

/** 1-based lines matching chapter1Scenario.codeLines */
const CODE = {
  entry: 1,
  flagCheck: 5,
  acquire: 7,
  query: 9,
  release: 14,
  respond: 17,
} as const;

export type Engine = {
  t: number;
  seed: number;
  rng: Rng;
  nextId: number;
  slots: (string | null)[];
  requests: Map<string, SimRequest>;
  waitingIds: string[];
  controls: EngineControls;
  flagLog: FlagLogEntry[];
  latency: LatencySample[];
  completedCount: number;
  rejectedNewCount: number;
  timeoutCount: number;
  shedCount: number;
  cacheHitCount: number;
  arrivalAcc: number;
  tracedId: string | null;
  /** Optional cap on new arrivals (guided pressure). */
  arrivalMultiplier: number;
  /** Completion timestamps for throughput window. */
  completionTimes: number[];
};

export function defaultControls(): EngineControls {
  return {
    arrivalRate: 80,
    recLookupSec: 0.07,
    baselineHoldSec: 0.012,
    exposurePct: 0,
    featureEnabled: false,
    featureDisabledForNew: false,
    paused: false,
    acquireTimeoutSec: null,
    shedAtUtil: null,
    cacheHitRate: 0,
    sloP99Sec: 0.2,
  };
}

export function createEngine(seed = 42, controls?: Partial<EngineControls>): Engine {
  return {
    t: 0,
    seed,
    rng: createRng(seed),
    nextId: 1,
    slots: Array.from({ length: POOL_SIZE }, () => null),
    requests: new Map(),
    waitingIds: [],
    controls: { ...defaultControls(), ...controls },
    flagLog: [],
    latency: [],
    completedCount: 0,
    rejectedNewCount: 0,
    timeoutCount: 0,
    shedCount: 0,
    cacheHitCount: 0,
    arrivalAcc: 0,
    tracedId: null,
    arrivalMultiplier: 1,
    completionTimes: [],
  };
}

export function resetEngine(engine: Engine, seed = engine.seed): Engine {
  const controls = { ...engine.controls };
  return createEngine(seed, controls);
}

function userIdFor(n: number): string {
  return `u-${(n % 997) + 1}`;
}

function meanHoldForControls(c: EngineControls): number {
  const featureLive = c.featureEnabled && !c.featureDisabledForNew;
  const p = featureLive ? c.exposurePct / 100 : 0;
  // Shed and cache reduce effective W for the exposed cohort.
  const shedFrac = c.shedAtUtil !== null ? 0 : 0; // util-dependent; approx below in snapshot
  const effectiveRecHold =
    c.recLookupSec * (1 - c.cacheHitRate) * (1 - shedFrac);
  return c.baselineHoldSec + p * effectiveRecHold;
}

/**
 * Approximate mean hold including shed gate when utilization is high.
 * Used for Little's Law teaching strip (demand estimate).
 */
function approxMeanHold(engine: Engine): number {
  const c = engine.controls;
  const featureLive = c.featureEnabled && !c.featureDisabledForNew;
  const p = featureLive ? c.exposurePct / 100 : 0;
  const util = engine.slots.filter(Boolean).length / POOL_SIZE;
  const shedding =
    c.shedAtUtil !== null && util >= c.shedAtUtil && featureLive;
  const shedFactor = shedding ? 0 : 1;
  const recExtra = c.recLookupSec * (1 - c.cacheHitRate) * shedFactor;
  return c.baselineHoldSec + p * recExtra;
}

function effectiveArrival(engine: Engine): number {
  return engine.controls.arrivalRate * engine.arrivalMultiplier;
}

function utilizationNow(engine: Engine): number {
  return engine.slots.filter((s) => s !== null).length / POOL_SIZE;
}

function spawnRequest(engine: Engine): SimRequest {
  const id = `r${engine.nextId++}`;
  const userId = userIdFor(engine.nextId);
  const featureOn = engine.controls.featureEnabled && !engine.controls.featureDisabledForNew;
  let exposed =
    featureOn && isUserExposed(userId, engine.controls.exposurePct);
  let shed = false;
  let cacheHit = false;
  let path: SimRequest["path"] = exposed ? "recs" : "baseline";
  let holdSec = engine.controls.baselineHoldSec;

  if (exposed) {
    const util = utilizationNow(engine);
    if (
      engine.controls.shedAtUtil !== null &&
      util >= engine.controls.shedAtUtil
    ) {
      // Load shed: skip the expensive path when the pool is saturated.
      shed = true;
      exposed = false;
      path = "baseline";
      holdSec = engine.controls.baselineHoldSec;
      engine.shedCount += 1;
    } else if (engine.rng.chance(engine.controls.cacheHitRate)) {
      cacheHit = true;
      path = "recs";
      // Cache hit still "takes" the recs branch in code, but hold ≈ baseline.
      holdSec = engine.controls.baselineHoldSec * 1.15;
      engine.cacheHitCount += 1;
    } else {
      holdSec = engine.controls.baselineHoldSec + engine.controls.recLookupSec;
    }
  }

  const jitter = 0.85 + engine.rng.next() * 0.3;
  const req: SimRequest = {
    id,
    userId,
    // Copper slots = recs cohort work (including cache hits). Shed falls back to baseline.
    exposed: path === "recs",
    featureOnAtArrival: featureOn,
    arrivalTime: engine.t,
    waitStart: null,
    acquireTime: null,
    releaseTime: null,
    doneTime: null,
    slotIndex: null,
    phase: "arriving",
    holdSec: holdSec * jitter,
    codeLine: CODE.entry,
    path,
    shed,
    cacheHit,
    timedOut: false,
  };
  engine.requests.set(id, req);
  return req;
}

function tryAcquire(engine: Engine, req: SimRequest): boolean {
  const free = engine.slots.findIndex((s) => s === null);
  if (free < 0) return false;
  engine.slots[free] = req.id;
  req.slotIndex = free;
  req.acquireTime = engine.t;
  req.phase = "holding";
  req.codeLine = req.path === "recs" ? CODE.query : CODE.acquire;
  return true;
}

function enqueueWait(engine: Engine, req: SimRequest) {
  if (req.phase === "waiting") return;
  req.phase = "waiting";
  req.waitStart = engine.t;
  req.codeLine = CODE.acquire;
  engine.waitingIds.push(req.id);
}

function completeRequest(engine: Engine, req: SimRequest, timedOut = false) {
  if (req.slotIndex !== null) {
    engine.slots[req.slotIndex] = null;
    req.slotIndex = null;
  }
  req.releaseTime = engine.t;
  req.doneTime = engine.t;
  req.timedOut = timedOut;
  req.phase = timedOut ? "timed_out" : "done";
  req.codeLine = timedOut ? CODE.acquire : CODE.respond;

  const waitSec =
    req.acquireTime !== null && req.waitStart !== null
      ? Math.max(0, req.acquireTime - req.waitStart)
      : req.acquireTime !== null
        ? Math.max(0, req.acquireTime - req.arrivalTime)
        : req.waitStart !== null
          ? Math.max(0, engine.t - req.waitStart)
          : 0;
  const holdSec =
    req.acquireTime !== null ? Math.max(0, engine.t - req.acquireTime) : 0;
  const totalSec = Math.max(0, engine.t - req.arrivalTime);
  engine.latency.push({
    t: engine.t,
    totalSec,
    waitSec,
    holdSec,
    exposed: req.exposed,
    path: req.path,
    timedOut,
    shed: req.shed,
    cacheHit: req.cacheHit,
  });
  if (engine.latency.length > 240) engine.latency.shift();
  if (!timedOut) {
    engine.completedCount += 1;
    engine.completionTimes.push(engine.t);
  } else {
    engine.timeoutCount += 1;
  }
  // Trim completion window
  const cutoff = engine.t - METRIC_WINDOW_SEC;
  while (engine.completionTimes.length > 0 && engine.completionTimes[0]! < cutoff) {
    engine.completionTimes.shift();
  }
}

function timeOutWaiting(engine: Engine) {
  const timeout = engine.controls.acquireTimeoutSec;
  if (timeout === null || timeout <= 0) return;
  const stillWaiting: string[] = [];
  for (const id of engine.waitingIds) {
    const req = engine.requests.get(id);
    if (!req || req.phase !== "waiting" || req.waitStart === null) continue;
    if (engine.t - req.waitStart >= timeout) {
      // Remove from wait queue and mark timed out — never acquired a slot.
      completeRequest(engine, req, true);
    } else {
      stillWaiting.push(id);
    }
  }
  engine.waitingIds = stillWaiting;
}

function drainWaiting(engine: Engine) {
  while (engine.waitingIds.length > 0) {
    const free = engine.slots.findIndex((s) => s === null);
    if (free < 0) break;
    const id = engine.waitingIds.shift()!;
    const req = engine.requests.get(id);
    if (!req || req.phase !== "waiting") continue;
    tryAcquire(engine, req);
  }
}

function advanceHolders(engine: Engine, dt: number) {
  for (const req of engine.requests.values()) {
    if (req.phase !== "holding" || req.acquireTime === null) continue;
    const held = engine.t + dt - req.acquireTime;
    if (req.path === "recs") {
      if (held < req.holdSec * 0.25) req.codeLine = CODE.flagCheck;
      else if (held < req.holdSec * 0.45) req.codeLine = CODE.acquire;
      else if (held < req.holdSec * 0.85) req.codeLine = CODE.query;
      else req.codeLine = CODE.release;
    } else {
      if (held < req.holdSec * 0.4) req.codeLine = CODE.acquire;
      else if (held < req.holdSec * 0.8) req.codeLine = CODE.query;
      else req.codeLine = CODE.release;
    }
    if (held >= req.holdSec) {
      completeRequest(engine, req, false);
    }
  }
}

function pruneDone(engine: Engine) {
  for (const [id, req] of engine.requests) {
    if (
      (req.phase === "done" || req.phase === "timed_out") &&
      req.doneTime !== null &&
      engine.t - req.doneTime > 2
    ) {
      if (engine.tracedId !== id) engine.requests.delete(id);
    }
    if (req.phase === "rejected_new" && req.doneTime !== null && engine.t - req.doneTime > 1.5) {
      engine.requests.delete(id);
    }
  }
}

export function setControls(engine: Engine, patch: Partial<EngineControls>, log = true) {
  const prev = engine.controls;
  const next = { ...prev, ...patch };

  // Pause freezes the exposure cohort: ignore attempted increases while paused.
  // Lowering exposure or disabling still works (incident controls).
  if (
    prev.paused &&
    patch.paused !== false &&
    patch.exposurePct !== undefined &&
    patch.exposurePct > prev.exposurePct
  ) {
    next.exposurePct = prev.exposurePct;
  }

  engine.controls = next;
  if (!log) return;
  if (patch.featureEnabled !== undefined && patch.featureEnabled !== prev.featureEnabled) {
    engine.flagLog.push({
      t: engine.t,
      kind: patch.featureEnabled ? "enable" : "disable",
      detail: patch.featureEnabled
        ? "Feature flag ON (deploy already live; exposure still controls who sees it)."
        : "Feature flag OFF — new requests skip recommendations.",
    });
  }
  if (patch.featureDisabledForNew === true && !prev.featureDisabledForNew) {
    engine.flagLog.push({
      t: engine.t,
      kind: "disable",
      detail:
        "Disable for new traffic: in-flight recommendations keep their connections; new arrivals take the baseline path.",
    });
  }
  if (
    patch.exposurePct !== undefined &&
    next.exposurePct !== prev.exposurePct
  ) {
    engine.flagLog.push({
      t: engine.t,
      kind: "exposure",
      detail: `Exposure set to ${next.exposurePct}% (stable user hashing).`,
    });
  } else if (
    patch.exposurePct !== undefined &&
    prev.paused &&
    patch.exposurePct > prev.exposurePct
  ) {
    engine.flagLog.push({
      t: engine.t,
      kind: "pause",
      detail: `Exposure raise blocked — rollout paused at ${prev.exposurePct}%. Disable or unpause to change cohort size.`,
    });
  }
  if (patch.paused === true && !prev.paused) {
    engine.flagLog.push({
      t: engine.t,
      kind: "pause",
      detail: `Rollout paused at ${next.exposurePct}% — cohort frozen; traffic and in-flight holds continue. Pausing does not drain the pool.`,
    });
  }
  if (
    patch.acquireTimeoutSec !== undefined &&
    patch.acquireTimeoutSec !== prev.acquireTimeoutSec
  ) {
    engine.flagLog.push({
      t: engine.t,
      kind: "mitigation",
      detail:
        patch.acquireTimeoutSec === null
          ? "Acquire timeout cleared — waiters may block indefinitely."
          : `Acquire timeout → ${(patch.acquireTimeoutSec * 1000).toFixed(0)}ms (maps to connectionTimeout).`,
    });
  }
  if (patch.shedAtUtil !== undefined && patch.shedAtUtil !== prev.shedAtUtil) {
    engine.flagLog.push({
      t: engine.t,
      kind: "mitigation",
      detail:
        patch.shedAtUtil === null
          ? "Load shed cleared — recs always attempt acquire when exposed."
          : `Load shed at ≥${Math.round(patch.shedAtUtil * 100)}% pool util — skip recs lookup when saturated.`,
    });
  }
  if (patch.cacheHitRate !== undefined && patch.cacheHitRate !== prev.cacheHitRate) {
    engine.flagLog.push({
      t: engine.t,
      kind: "mitigation",
      detail: `Cache hit rate → ${Math.round(patch.cacheHitRate * 100)}% (shortens mean W on the recs path).`,
    });
  }
  if (engine.flagLog.length > 48) engine.flagLog.shift();
}

export function injectSingleRequest(engine: Engine, opts?: { forceExposed?: boolean }): SimRequest {
  const req = spawnRequest(engine);
  if (opts?.forceExposed) {
    req.exposed = true;
    req.path = "recs";
    req.shed = false;
    req.cacheHit = false;
    req.holdSec = engine.controls.baselineHoldSec + engine.controls.recLookupSec;
    req.featureOnAtArrival = true;
  }
  req.codeLine = CODE.entry;
  if (!tryAcquire(engine, req)) enqueueWait(engine, req);
  engine.tracedId = req.id;
  return req;
}

export function tick(engine: Engine, dt = DEFAULT_TICK_SEC): EngineSnapshot {
  advanceHolders(engine, dt);
  timeOutWaiting(engine);
  drainWaiting(engine);

  const rate = effectiveArrival(engine);
  engine.arrivalAcc += rate * dt;
  while (engine.arrivalAcc >= 1) {
    engine.arrivalAcc -= 1;
    const req = spawnRequest(engine);
    if (!tryAcquire(engine, req)) {
      enqueueWait(engine, req);
    }
  }

  engine.t += dt;
  // Prune completion window after t advances
  const cutoff = engine.t - METRIC_WINDOW_SEC;
  while (engine.completionTimes.length > 0 && engine.completionTimes[0]! < cutoff) {
    engine.completionTimes.shift();
  }
  pruneDone(engine);
  return snapshot(engine);
}

export function stepOnce(engine: Engine): EngineSnapshot {
  return tick(engine, DEFAULT_TICK_SEC);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

function pathLatency(samples: LatencySample[], path: "baseline" | "recs"): PathLatency {
  const totals = samples.filter((s) => s.path === path && !s.timedOut).map((s) => s.totalSec);
  return {
    p50: percentile(totals, 50),
    p99: percentile(totals, 99),
    count: totals.length,
  };
}

export function snapshot(engine: Engine): EngineSnapshot {
  const active: SimRequest[] = [];
  const slots: SlotState[] = engine.slots.map((requestId, index) => {
    const req = requestId ? engine.requests.get(requestId) : undefined;
    if (req && req.phase === "holding") active.push(req);
    return {
      index,
      requestId,
      exposed: req?.exposed ?? false,
    };
  });

  const activeCount = Math.min(POOL_SIZE, active.length);
  const idleCount = POOL_SIZE - activeCount;

  const waiting = engine.waitingIds
    .map((id) => engine.requests.get(id))
    .filter((r): r is SimRequest => !!r && r.phase === "waiting");

  const hold = approxMeanHold(engine);
  const lambda = effectiveArrival(engine);
  const littles = littlesLaw(lambda, hold, POOL_SIZE);

  const recent = engine.latency.slice(-80);
  const okSamples = recent.filter((s) => !s.timedOut);
  const totals = okSamples.map((s) => s.totalSec);
  const waits = okSamples.map((s) => s.waitSec);
  const latencyP50 = percentile(totals, 50);
  const latencyP99 = percentile(totals, 99);
  const acquireWaitP50 = percentile(waits, 50);
  const acquireWaitP99 = percentile(waits, 99);
  const meanWaitSec =
    waits.length === 0 ? 0 : waits.reduce((a, b) => a + b, 0) / waits.length;

  const windowSec = Math.min(METRIC_WINDOW_SEC, Math.max(engine.t, 0.05));
  const throughputRps = engine.completionTimes.length / windowSec;
  const utilization = activeCount / POOL_SIZE;

  const target = engine.controls.sloP99Sec;
  const slo = {
    targetP99Sec: target,
    observedP99Sec: latencyP99,
    breached: totals.length >= 8 && latencyP99 > target,
    burnRatio: target > 0 ? latencyP99 / target : 0,
  };

  return {
    t: engine.t,
    poolSize: POOL_SIZE,
    slots,
    waiting,
    active,
    activeCount,
    idleCount,
    waitingCount: waiting.length,
    completedCount: engine.completedCount,
    rejectedNewCount: engine.rejectedNewCount,
    timeoutCount: engine.timeoutCount,
    shedCount: engine.shedCount,
    cacheHitCount: engine.cacheHitCount,
    controls: { ...engine.controls },
    littles,
    latencyP50,
    latencyP99,
    acquireWaitP50,
    acquireWaitP99,
    meanWaitSec,
    throughputRps,
    utilization,
    latencyBaseline: pathLatency(recent, "baseline"),
    latencyRecs: pathLatency(recent, "recs"),
    slo,
    recentLatency: recent,
    flagLog: [...engine.flagLog],
    tracedId: engine.tracedId,
    tracedRequest: engine.tracedId
      ? (engine.requests.get(engine.tracedId) ?? null)
      : null,
    demandOccupancy: littles.demand,
  };
}

export function getRequest(engine: Engine, id: string | null): SimRequest | null {
  if (!id) return null;
  return engine.requests.get(id) ?? null;
}

/** Expose meanHold helper for tests / teaching callouts. */
export { meanHoldForControls, approxMeanHold };

export { CODE as CODE_LINES };
