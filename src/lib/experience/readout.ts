import type { EngineSnapshot, SimRequest } from "@/lib/experience/types";

/**
 * The only numbers Chapter 1 is allowed to show.
 * Headline, live status, and challenge scoring all read this projection.
 */
export type Chapter1Readout = {
  busy: number;
  idle: number;
  waiting: number;
  poolSize: number;
  utilization: number;
  demand: number;
  offeredPoolRps: number;
  admittedPoolRps: number;
  p50Sec: number;
  p99Sec: number;
  acquireWaitP50Sec: number;
  acquireWaitP99Sec: number;
  throughputRps: number;
};

export function readChapter1(snap: EngineSnapshot): Chapter1Readout {
  return {
    busy: snap.activeCount,
    idle: snap.idleCount,
    waiting: snap.waitingCount,
    poolSize: snap.poolSize,
    utilization: snap.utilization,
    demand: snap.demandOccupancy,
    offeredPoolRps: snap.offeredPoolRps,
    admittedPoolRps: snap.admittedPoolRps,
    p50Sec: snap.latencyP50,
    p99Sec: snap.latencyP99,
    acquireWaitP50Sec: snap.acquireWaitP50,
    acquireWaitP99Sec: snap.acquireWaitP99,
    throughputRps: snap.throughputRps,
  };
}

export type RequestTiming = {
  callerSec: number;
  waitSec: number;
  holdSec: number;
  totalSec: number;
};

/** Caller time, acquire wait, and database hold for one request. No leftover "rest". */
export function requestTiming(req: SimRequest, now: number): RequestTiming {
  const callerSec =
    req.phase === "arriving"
      ? Math.min(req.callerSec, Math.max(0, now - req.arrivalTime))
      : req.callerSec;

  let waitSec = 0;
  if (req.phase === "waiting" && req.waitStart !== null) {
    waitSec = Math.max(0, now - req.waitStart);
  } else if (req.acquireTime !== null && req.waitStart !== null) {
    waitSec = Math.max(0, req.acquireTime - req.waitStart);
  } else if (req.timedOut && req.waitStart !== null) {
    const end = req.doneTime ?? now;
    waitSec = Math.max(0, end - req.waitStart);
  }

  let holdSec = 0;
  if (req.phase === "holding" && req.acquireTime !== null) {
    holdSec = Math.max(0, Math.min(req.poolHoldSec, now - req.acquireTime));
  } else if (req.acquireTime !== null && req.phase !== "waiting" && req.phase !== "arriving") {
    holdSec = req.poolHoldSec;
  }

  return {
    callerSec,
    waitSec,
    holdSec,
    totalSec: callerSec + waitSec + holdSec,
  };
}
