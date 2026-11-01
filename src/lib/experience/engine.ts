import { createRng, isUserExposed, type Rng } from "@/lib/experience/rng";
import { littlesLaw } from "@/lib/experience/littles";
import { requestTiming } from "@/lib/experience/readout";
import { clampBusy, utilization } from "@/lib/sim/bounds";
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
/**
 * Commanded flag changes reach new arrivals after this delay.
 * In-flight holds are never cancelled to make the cohort catch up.
 */
export const FLAG_PROPAGATION_SEC = 0.25;

/**
 * 1-based lines matching chapter1Scenario.codeLines.
 * Product Page calls Recommendation; the shared pool lives only in Recommendation.
 */
const CODE = {
  entry: 1,
  catalog: 2,
  flagCheck: 4,
  callRec: 6,
  acquire: 13,
  query: 15,
  release: 20,
  respond: 8,
} as const;

type FlagView = {
  featureEnabled: boolean;
  featureDisabledForNew: boolean;
  exposurePct: number;
};

export type Engine = {
  t: number;
  seed: number;
  rng: Rng;
  nextId: number;
  slots: (string | null)[];
  requests: Map<string, SimRequest>;
  waitingIds: string[];
  controls: EngineControls;
  /** Flag generation that new arrivals actually see. */
  appliedFlag: FlagView;
  /** Latest commanded flag, applied when t reaches applyAt. */
  pendingFlag: { view: FlagView; applyAt: number } | null;
  /** Play/pause. A frozen tick does not advance or reorder the queue. */
  frozen: boolean;
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

function flagView(c: Pick<EngineControls, "featureEnabled" | "featureDisabledForNew" | "exposurePct">): FlagView {
  return {
    featureEnabled: c.featureEnabled,
    featureDisabledForNew: c.featureDisabledForNew,
    exposurePct: c.exposurePct,
  };
}

function sameFlag(a: FlagView, b: FlagView): boolean {
  return (
    a.featureEnabled === b.featureEnabled &&
    a.featureDisabledForNew === b.featureDisabledForNew &&
    a.exposurePct === b.exposurePct
  );
}

export function createEngine(seed = 42, controls?: Partial<EngineControls>): Engine {
  const merged = { ...defaultControls(), ...controls };
  return {
    t: 0,
    seed,
    rng: createRng(seed),
    nextId: 1,
    slots: Array.from({ length: POOL_SIZE }, () => null),
    requests: new Map(),
    waitingIds: [],
    controls: merged,
    appliedFlag: flagView(merged),
    pendingFlag: null,
    frozen: false,
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

/** Freeze the clock. Queued waiters stay in arrival order until the clock moves again. */
export function setSimFrozen(engine: Engine, frozen: boolean) {
  engine.frozen = frozen;
}

function userIdFor(n: number): string {
  return `u-${(n % 997) + 1}`;
}

function featureLive(flag: FlagView): boolean {
  return flag.featureEnabled && !flag.featureDisabledForNew;
}

function exposureFraction(flag: FlagView): number {
  return featureLive(flag) ? flag.exposurePct / 100 : 0;
}

/**
 * Pool demand from the flag new arrivals are actually using.
 * Catalog time is not part of W. Cache misses are the only acquires.
 * While the shed gate is open, admitted λ drops to 0; offered λ does not.
 */
function poolDemand(engine: Engine): {
  offeredRps: number;
  admittedRps: number;
  W: number;
  shedding: boolean;
} {
  const c = engine.controls;
  const p = exposureFraction(engine.appliedFlag);
  const miss = Math.min(1, Math.max(0, 1 - c.cacheHitRate));
  const offeredRps = c.arrivalRate * engine.arrivalMultiplier * p * miss;
  const util = utilizationNow(engine);
  const shedding =
    c.shedAtUtil !== null && util >= c.shedAtUtil && p > 0 && miss > 0;
  return {
    offeredRps,
    admittedRps: shedding ? 0 : offeredRps,
    W: c.recLookupSec,
    shedding,
  };
}

function effectiveArrival(engine: Engine): number {
  return engine.controls.arrivalRate * engine.arrivalMultiplier;
}

function utilizationNow(engine: Engine): number {
  return utilization(
    engine.slots.filter((s) => s !== null).length,
    POOL_SIZE,
  );
}

function spawnRequest(engine: Engine, opts?: { forceExposed?: boolean }): SimRequest {
  const id = `r${engine.nextId++}`;
  const userId = userIdFor(engine.nextId);
  const flag = engine.appliedFlag;
  const featureOn = featureLive(flag) || Boolean(opts?.forceExposed);
  let exposed = opts?.forceExposed ? true : featureOn && isUserExposed(userId, flag.exposurePct);
  let shed = false;
  let cacheHit = false;
  let path: SimRequest["path"] = exposed ? "recs" : "baseline";
  const callerSec = engine.controls.baselineHoldSec * (0.85 + engine.rng.next() * 0.3);
  let poolHoldSec = 0;

  if (opts?.forceExposed) {
    path = "recs";
    exposed = true;
    poolHoldSec = engine.controls.recLookupSec * (0.85 + engine.rng.next() * 0.3);
  } else if (exposed) {
    const util = utilizationNow(engine);
    if (
      engine.controls.shedAtUtil !== null &&
      util >= engine.controls.shedAtUtil
    ) {
      shed = true;
      exposed = false;
      path = "baseline";
      engine.shedCount += 1;
    } else if (engine.rng.chance(engine.controls.cacheHitRate)) {
      cacheHit = true;
      path = "recs";
      poolHoldSec = 0;
      engine.cacheHitCount += 1;
    } else {
      path = "recs";
      poolHoldSec = engine.controls.recLookupSec * (0.85 + engine.rng.next() * 0.3);
    }
  }

  const req: SimRequest = {
    id,
    userId,
    exposed: path === "recs",
    featureOnAtArrival: featureOn,
    arrivalTime: engine.t,
    waitStart: null,
    acquireTime: null,
    releaseTime: null,
    doneTime: null,
    slotIndex: null,
    phase: "arriving",
    callerSec,
    poolHoldSec,
    holdSec: poolHoldSec,
    codeLine: path === "recs" ? CODE.callRec : CODE.catalog,
    path,
    shed,
    cacheHit,
    timedOut: false,
  };
  engine.requests.set(id, req);
  return req;
}

function tryAcquire(engine: Engine, req: SimRequest, at: number): boolean {
  if (req.path !== "recs" || req.poolHoldSec <= 0) return false;
  const free = engine.slots.findIndex((s) => s === null);
  if (free < 0) return false;
  engine.slots[free] = req.id;
  req.slotIndex = free;
  req.acquireTime = at;
  req.phase = "holding";
  req.codeLine = CODE.acquire;
  return true;
}

function enqueueWait(engine: Engine, req: SimRequest, at: number) {
  if (req.phase === "waiting") return;
  req.phase = "waiting";
  req.waitStart = req.waitStart ?? at;
  req.codeLine = CODE.acquire;
  engine.waitingIds.push(req.id);
}

function completeRequest(engine: Engine, req: SimRequest, now: number, timedOut = false) {
  if (req.phase === "done" || req.phase === "timed_out") return;
  if (req.slotIndex !== null) {
    engine.slots[req.slotIndex] = null;
    req.slotIndex = null;
  }
  engine.waitingIds = engine.waitingIds.filter((id) => id !== req.id);
  req.releaseTime = timedOut ? null : now;
  req.doneTime = now;
  req.timedOut = timedOut;
  req.phase = timedOut ? "timed_out" : "done";
  req.codeLine = timedOut ? CODE.acquire : CODE.respond;

  const timing = requestTiming(req, now);
  engine.latency.push({
    t: now,
    totalSec: timing.totalSec,
    callerSec: timing.callerSec,
    waitSec: timing.waitSec,
    holdSec: timing.holdSec,
    exposed: req.exposed,
    path: req.path,
    timedOut,
    shed: req.shed,
    cacheHit: req.cacheHit,
  });
  if (engine.latency.length > 240) engine.latency.shift();
  if (!timedOut) {
    engine.completedCount += 1;
    engine.completionTimes.push(now);
  } else {
    engine.timeoutCount += 1;
  }
  const cutoff = now - METRIC_WINDOW_SEC;
  while (engine.completionTimes.length > 0 && engine.completionTimes[0]! < cutoff) {
    engine.completionTimes.shift();
  }
}

function timeOutWaiting(engine: Engine, now: number) {
  const timeout = engine.controls.acquireTimeoutSec;
  if (timeout === null || timeout <= 0) return;
  const stillWaiting: string[] = [];
  for (const id of engine.waitingIds) {
    const req = engine.requests.get(id);
    if (!req || req.phase !== "waiting" || req.waitStart === null) continue;
    if (now - req.waitStart >= timeout) {
      completeRequest(engine, req, now, true);
    } else {
      stillWaiting.push(id);
    }
  }
  engine.waitingIds = stillWaiting;
}

function drainWaiting(engine: Engine, now: number) {
  while (engine.waitingIds.length > 0) {
    const free = engine.slots.findIndex((s) => s === null);
    if (free < 0) break;
    const id = engine.waitingIds[0]!;
    const req = engine.requests.get(id);
    if (!req || req.phase !== "waiting") {
      engine.waitingIds.shift();
      continue;
    }
    engine.waitingIds.shift();
    if (!tryAcquire(engine, req, now)) {
      engine.waitingIds.unshift(id);
      break;
    }
  }
}

function advanceHolders(engine: Engine, now: number) {
  const holders = [...engine.requests.values()].filter((req) => req.phase === "holding");
  for (const req of holders) {
    if (req.acquireTime === null) continue;
    const held = now - req.acquireTime;
    if (held < req.poolHoldSec * 0.2) req.codeLine = CODE.acquire;
    else if (held < req.poolHoldSec * 0.8) req.codeLine = CODE.query;
    else req.codeLine = CODE.release;
    if (held >= req.poolHoldSec) {
      completeRequest(engine, req, req.acquireTime + req.poolHoldSec, false);
    }
  }
}

function advanceCatalog(engine: Engine, now: number) {
  const arriving = [...engine.requests.values()].filter((req) => req.phase === "arriving");
  for (const req of arriving) {
    if (req.arrivalTime + req.callerSec > now) continue;
    const readyAt = req.arrivalTime + req.callerSec;
    const needsPool = req.path === "recs" && req.poolHoldSec > 0 && !req.cacheHit;
    if (!needsPool) {
      completeRequest(engine, req, readyAt, false);
      continue;
    }
    if (!tryAcquire(engine, req, readyAt)) enqueueWait(engine, req, readyAt);
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

function applyDueFlag(engine: Engine) {
  if (!engine.pendingFlag) return;
  if (engine.t < engine.pendingFlag.applyAt) return;
  engine.appliedFlag = engine.pendingFlag.view;
  engine.pendingFlag = null;
}

export function setControls(engine: Engine, patch: Partial<EngineControls>, log = true) {
  const prev = engine.controls;
  const next = { ...prev, ...patch };

  // Rollout pause freezes the exposure cohort: ignore attempted increases.
  // Lowering exposure or disabling still works.
  if (
    prev.paused &&
    patch.paused !== false &&
    patch.exposurePct !== undefined &&
    patch.exposurePct > prev.exposurePct
  ) {
    next.exposurePct = prev.exposurePct;
  }

  engine.controls = next;

  const flagTouched =
    patch.featureEnabled !== undefined ||
    patch.featureDisabledForNew !== undefined ||
    patch.exposurePct !== undefined;
  if (flagTouched) {
    const view = flagView(next);
    if (sameFlag(view, engine.appliedFlag)) engine.pendingFlag = null;
    else engine.pendingFlag = { view, applyAt: engine.t + FLAG_PROPAGATION_SEC };
  }

  if (!log) return;
  if (patch.featureEnabled !== undefined && patch.featureEnabled !== prev.featureEnabled) {
    engine.flagLog.push({
      t: engine.t,
      kind: patch.featureEnabled ? "enable" : "disable",
      detail: patch.featureEnabled
        ? "Feature flag ON (deploy already live; exposure still controls who sees it)."
        : "Feature flag OFF. New requests skip recommendations after propagation. In-flight holds continue.",
    });
  }
  if (patch.featureDisabledForNew === true && !prev.featureDisabledForNew) {
    engine.flagLog.push({
      t: engine.t,
      kind: "disable",
      detail:
        "Disable for new traffic: in-flight recommendations keep their connections; new arrivals take the baseline path once the flag propagates.",
    });
  }
  if (patch.exposurePct !== undefined && next.exposurePct !== prev.exposurePct) {
    engine.flagLog.push({
      t: engine.t,
      kind: "exposure",
      detail: `Exposure set to ${next.exposurePct}% (stable user hashing, ${FLAG_PROPAGATION_SEC}s propagation).`,
    });
  } else if (
    patch.exposurePct !== undefined &&
    prev.paused &&
    patch.exposurePct > prev.exposurePct
  ) {
    engine.flagLog.push({
      t: engine.t,
      kind: "pause",
      detail: `Exposure raise blocked. rollout paused at ${prev.exposurePct}%. Disable or unpause to change cohort size.`,
    });
  }
  if (patch.paused === true && !prev.paused) {
    engine.flagLog.push({
      t: engine.t,
      kind: "pause",
      detail: `Rollout paused at ${next.exposurePct}%. cohort frozen; traffic and in-flight holds continue. Pausing does not drain the pool or reorder waiters.`,
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
          ? "Acquire timeout cleared. Waiters may block indefinitely."
          : `Acquire timeout → ${(patch.acquireTimeoutSec * 1000).toFixed(0)}ms (maps to connectionTimeout).`,
    });
  }
  if (patch.shedAtUtil !== undefined && patch.shedAtUtil !== prev.shedAtUtil) {
    engine.flagLog.push({
      t: engine.t,
      kind: "mitigation",
      detail:
        patch.shedAtUtil === null
          ? "Load shed cleared. Recs always attempt acquire when exposed."
          : `Load shed at ≥${Math.round(patch.shedAtUtil * 100)}% pool util. skip recs lookup when saturated.`,
    });
  }
  if (patch.cacheHitRate !== undefined && patch.cacheHitRate !== prev.cacheHitRate) {
    engine.flagLog.push({
      t: engine.t,
      kind: "mitigation",
      detail: `Cache hit rate → ${Math.round(patch.cacheHitRate * 100)}% (cache hits skip the pool, which shortens mean W).`,
    });
  }
  if (engine.flagLog.length > 48) engine.flagLog.shift();
}

export function injectSingleRequest(engine: Engine, opts?: { forceExposed?: boolean }): SimRequest {
  const req = spawnRequest(engine, opts);
  req.phase = "arriving";
  req.codeLine = req.path === "recs" ? CODE.callRec : CODE.catalog;
  engine.tracedId = req.id;
  return req;
}

export function tick(
  engine: Engine,
  dt = DEFAULT_TICK_SEC,
  opts?: { force?: boolean },
): EngineSnapshot {
  if (engine.frozen && !opts?.force) return snapshot(engine);

  applyDueFlag(engine);
  const now = engine.t + dt;

  // Free slots before anyone new may take them, then serve the existing queue
  // before catalog graduates. That keeps waiter order stable across pause/resume.
  advanceHolders(engine, now);
  timeOutWaiting(engine, now);
  drainWaiting(engine, now);

  const rate = effectiveArrival(engine);
  engine.arrivalAcc += rate * dt;
  let guard = 0;
  while (engine.arrivalAcc >= 1 && guard < 10000) {
    engine.arrivalAcc -= 1;
    guard += 1;
    spawnRequest(engine);
  }

  advanceCatalog(engine, now);
  drainWaiting(engine, now);

  engine.t = now;
  const cutoff = engine.t - METRIC_WINDOW_SEC;
  while (engine.completionTimes.length > 0 && engine.completionTimes[0]! < cutoff) {
    engine.completionTimes.shift();
  }
  pruneDone(engine);
  return snapshot(engine);
}

export function stepOnce(engine: Engine): EngineSnapshot {
  return tick(engine, DEFAULT_TICK_SEC, { force: true });
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
      requestId: req && req.phase === "holding" ? requestId : null,
      exposed: Boolean(req && req.phase === "holding" && req.exposed),
    };
  });

  const activeCount = clampBusy(active.length, POOL_SIZE);
  const idleCount = POOL_SIZE - activeCount;

  const waiting = engine.waitingIds
    .map((id) => engine.requests.get(id))
    .filter((r): r is SimRequest => !!r && r.phase === "waiting");

  const demand = poolDemand(engine);
  const littles = littlesLaw(demand.admittedRps, demand.W, POOL_SIZE);

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

  const target = engine.controls.sloP99Sec;
  const slo = {
    targetP99Sec: target,
    observedP99Sec: latencyP99,
    breached: totals.length >= 8 && latencyP99 > target,
    burnRatio: target > 0 ? latencyP99 / target : 0,
  };

  const remaining = engine.pendingFlag
    ? Math.max(0, engine.pendingFlag.applyAt - engine.t)
    : 0;

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
    utilization: utilization(activeCount, POOL_SIZE),
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
    offeredPoolRps: demand.offeredRps,
    admittedPoolRps: demand.admittedRps,
    seed: engine.seed,
    frozen: engine.frozen,
    appliedExposurePct: engine.appliedFlag.exposurePct,
    appliedFeatureEnabled: engine.appliedFlag.featureEnabled,
    appliedFeatureDisabledForNew: engine.appliedFlag.featureDisabledForNew,
    flagPropagationRemainingSec: remaining,
  };
}

export function getRequest(engine: Engine, id: string | null): SimRequest | null {
  if (!id) return null;
  return engine.requests.get(id) ?? null;
}

export { CODE as CODE_LINES };
