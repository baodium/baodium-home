import { createRng, isUserExposed, type Rng } from "@/lib/experience/rng";
import { littlesLaw } from "@/lib/experience/littles";
import type {
  EngineControls,
  EngineSnapshot,
  FlagLogEntry,
  LatencySample,
  SimRequest,
  SlotState,
} from "@/lib/experience/types";

export const POOL_SIZE = 40;
export const DEFAULT_TICK_SEC = 0.05;

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
  arrivalAcc: number;
  tracedId: string | null;
  /** Optional cap on new arrivals (guided pressure). */
  arrivalMultiplier: number;
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
    arrivalAcc: 0,
    tracedId: null,
    arrivalMultiplier: 1,
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
  const p = c.featureEnabled && !c.featureDisabledForNew ? c.exposurePct / 100 : 0;
  return c.baselineHoldSec + p * c.recLookupSec;
}

function effectiveArrival(engine: Engine): number {
  return engine.controls.arrivalRate * engine.arrivalMultiplier;
}

function spawnRequest(engine: Engine): SimRequest {
  const id = `r${engine.nextId++}`;
  const userId = userIdFor(engine.nextId);
  const featureOn = engine.controls.featureEnabled && !engine.controls.featureDisabledForNew;
  const exposed =
    featureOn && isUserExposed(userId, engine.controls.exposurePct);
  const path = exposed ? "recs" : "baseline";
  const holdSec =
    engine.controls.baselineHoldSec + (exposed ? engine.controls.recLookupSec : 0);
  // Small jitter so the grid feels alive
  const jitter = 0.85 + engine.rng.next() * 0.3;
  const req: SimRequest = {
    id,
    userId,
    exposed,
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
  if (req.waitStart !== null) {
    // waited
  }
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

function completeRequest(engine: Engine, req: SimRequest) {
  if (req.slotIndex !== null) {
    engine.slots[req.slotIndex] = null;
  }
  req.releaseTime = engine.t;
  req.doneTime = engine.t;
  req.phase = "done";
  req.codeLine = CODE.respond;
  const waitSec =
    req.acquireTime !== null && req.waitStart !== null
      ? Math.max(0, req.acquireTime - req.waitStart)
      : req.acquireTime !== null
        ? Math.max(0, req.acquireTime - req.arrivalTime)
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
  });
  if (engine.latency.length > 200) engine.latency.shift();
  engine.completedCount += 1;
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
    // Progress code highlight during hold
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
      completeRequest(engine, req);
    }
  }
}

function pruneDone(engine: Engine) {
  for (const [id, req] of engine.requests) {
    if (req.phase === "done" && req.doneTime !== null && engine.t - req.doneTime > 2) {
      if (engine.tracedId !== id) engine.requests.delete(id);
    }
    if (req.phase === "rejected_new" && req.doneTime !== null && engine.t - req.doneTime > 1.5) {
      engine.requests.delete(id);
    }
  }
}

export function setControls(engine: Engine, patch: Partial<EngineControls>, log = true) {
  const prev = engine.controls;
  engine.controls = { ...prev, ...patch };
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
  if (patch.exposurePct !== undefined && patch.exposurePct !== prev.exposurePct) {
    engine.flagLog.push({
      t: engine.t,
      kind: "exposure",
      detail: `Exposure set to ${patch.exposurePct}% (stable user hashing).`,
    });
  }
  if (patch.paused === true && !prev.paused) {
    engine.flagLog.push({
      t: engine.t,
      kind: "pause",
      detail: "Rollout paused — exposure frozen; sim clock still runs unless you pause the clock.",
    });
  }
  if (engine.flagLog.length > 40) engine.flagLog.shift();
}

export function injectSingleRequest(engine: Engine, opts?: { forceExposed?: boolean }): SimRequest {
  const req = spawnRequest(engine);
  if (opts?.forceExposed) {
    req.exposed = true;
    req.path = "recs";
    req.holdSec = engine.controls.baselineHoldSec + engine.controls.recLookupSec;
    req.featureOnAtArrival = true;
  }
  req.codeLine = CODE.entry;
  if (!tryAcquire(engine, req)) enqueueWait(engine, req);
  engine.tracedId = req.id;
  return req;
}

export function tick(engine: Engine, dt = DEFAULT_TICK_SEC): EngineSnapshot {
  if (!engine.controls.paused) {
    // Wall clock for sim always advances when not clock-paused.
    // `controls.paused` is rollout pause — handled via exposure freeze by caller if needed.
  }

  advanceHolders(engine, dt);
  drainWaiting(engine);

  // Arrivals
  const rate = effectiveArrival(engine);
  engine.arrivalAcc += rate * dt;
  while (engine.arrivalAcc >= 1) {
    engine.arrivalAcc -= 1;
    const req = spawnRequest(engine);
    // If feature was disabled for new and somehow marked exposed, force baseline
    if (engine.controls.featureDisabledForNew && req.exposed) {
      // shouldn't happen because spawn checks featureDisabledForNew
    }
    if (!tryAcquire(engine, req)) {
      enqueueWait(engine, req);
    }
  }

  engine.t += dt;
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

  // Hard invariant: never more active than pool size
  const activeCount = Math.min(POOL_SIZE, active.length);

  const waiting = engine.waitingIds
    .map((id) => engine.requests.get(id))
    .filter((r): r is SimRequest => !!r && r.phase === "waiting");

  const hold = meanHoldForControls(engine.controls);
  const lambda = effectiveArrival(engine);
  const littles = littlesLaw(lambda, hold, POOL_SIZE);

  const totals = engine.latency.map((s) => s.totalSec);

  return {
    t: engine.t,
    poolSize: POOL_SIZE,
    slots,
    waiting,
    active,
    activeCount,
    waitingCount: waiting.length,
    completedCount: engine.completedCount,
    rejectedNewCount: engine.rejectedNewCount,
    controls: { ...engine.controls },
    littles,
    latencyP50: percentile(totals, 50),
    latencyP99: percentile(totals, 99),
    recentLatency: engine.latency.slice(-60),
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

export { CODE as CODE_LINES };
