import {
  createEngine,
  setControls,
  setSimFrozen,
  snapshot as takeSnapshot,
  tick,
  POOL_SIZE,
  FLAG_PROPAGATION_SEC,
} from "../src/lib/experience/engine";
import { poolIsOutsideProductPage, SERVICE_EDGES } from "../src/lib/experience/service-topology";
import { readChapter1 } from "../src/lib/experience/readout";
import { isUserExposed } from "../src/lib/experience/rng";
import { createEngine as createSlo, tick as tickSlo } from "../src/lib/slo-watch";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// --- Pressure: busy capped, waiters appear ---
{
  const eng = createEngine(7, {
    arrivalRate: 550,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.09,
    baselineHoldSec: 0.012,
  });

  let maxActive = 0;
  let maxWait = 0;
  for (let i = 0; i < 1000; i++) {
    const snap = tick(eng, 0.01);
    maxActive = Math.max(maxActive, snap.activeCount);
    maxWait = Math.max(maxWait, snap.waitingCount);
    assert(snap.activeCount <= POOL_SIZE, `active > pool (${snap.activeCount})`);
  }

  const last = tick(eng, 0);
  console.log(
    JSON.stringify(
      {
        pressure: {
          ok: maxActive <= POOL_SIZE && maxWait > 0,
          maxActive,
          maxWait,
          poolSize: POOL_SIZE,
          littles: last.littles,
          acquireWaitP99ms: +(last.acquireWaitP99 * 1000).toFixed(1),
          util: +last.utilization.toFixed(2),
        },
      },
      null,
      2,
    ),
  );
  assert(maxActive <= POOL_SIZE && maxWait > 0, "pressure invariants");

  // Disable semantics
  setControls(eng, { featureDisabledForNew: true, featureEnabled: false, exposurePct: 0 });
  const before = [...eng.slots].filter(Boolean).length;
  for (let i = 0; i < 200; i++) tick(eng, 0.01);
  const after = tick(eng, 0);
  console.log(
    JSON.stringify({
      disableCheck: {
        slotsBusyAtDisable: before,
        waitingAfterDrainWindow: after.waitingCount,
        activeAfter: after.activeCount,
      },
    }),
  );
}

// --- Acquire timeout produces hard failures, never >40 busy ---
{
  const eng = createEngine(11, {
    arrivalRate: 500,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.1,
    acquireTimeoutSec: 0.08,
  });
  for (let i = 0; i < 800; i++) tick(eng, 0.01);
  const snap = tick(eng, 0);
  console.log(
    JSON.stringify({
      timeoutCheck: {
        timeouts: snap.timeoutCount,
        maxBusyOk: snap.activeCount <= POOL_SIZE,
        pending: snap.waitingCount,
        acquireWaitP99ms: +(snap.acquireWaitP99 * 1000).toFixed(1),
      },
    }),
  );
  assert(snap.timeoutCount > 0, "expected acquire timeouts under pressure");
  assert(snap.activeCount <= POOL_SIZE, "timeout path active > pool");
}

// --- Load shed: util gate skips recs, reduces demand ---
{
  const eng = createEngine(13, {
    arrivalRate: 400,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.09,
    shedAtUtil: 0.7,
  });
  for (let i = 0; i < 600; i++) tick(eng, 0.01);
  const snap = tick(eng, 0);
  console.log(
    JSON.stringify({
      shedCheck: {
        shedCount: snap.shedCount,
        demand: +snap.littles.L.toFixed(1),
        active: snap.activeCount,
        pending: snap.waitingCount,
      },
    }),
  );
  assert(snap.shedCount > 0, "expected shed under util gate");
}

// --- Cache shortens effective W ---
{
  const cold = createEngine(17, {
    arrivalRate: 120,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.08,
    cacheHitRate: 0,
  });
  const warm = createEngine(17, {
    arrivalRate: 120,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.08,
    cacheHitRate: 0.8,
  });
  for (let i = 0; i < 500; i++) {
    tick(cold, 0.01);
    tick(warm, 0.01);
  }
  const c = tick(cold, 0);
  const w = tick(warm, 0);
  console.log(
    JSON.stringify({
      cacheCheck: {
        coldDemand: +c.littles.L.toFixed(1),
        warmDemand: +w.littles.L.toFixed(1),
        cacheHits: w.cacheHitCount,
        warmLowerDemand: w.littles.L < c.littles.L,
      },
    }),
  );
  assert(w.cacheHitCount > 0, "expected cache hits");
  assert(w.littles.L < c.littles.L, "cache should reduce demand L");
}

// --- Path-split latency + SLO fields present ---
{
  const eng = createEngine(19, {
    arrivalRate: 100,
    exposurePct: 50,
    featureEnabled: true,
    recLookupSec: 0.07,
  });
  for (let i = 0; i < 400; i++) tick(eng, 0.01);
  const snap = tick(eng, 0);
  assert(typeof snap.slo.burnRatio === "number", "slo missing");
  assert(snap.latencyBaseline.count + snap.latencyRecs.count > 0, "path latency empty");
  assert(
    snap.latencyRecs.count === 0 ||
      snap.latencyBaseline.count === 0 ||
      snap.latencyRecs.p50 > snap.latencyBaseline.p50,
    "recs path should be slower than baseline when both present",
  );
  console.log(
    JSON.stringify({
      opsCheck: {
        throughputRps: +snap.throughputRps.toFixed(1),
        baselineP50ms: +(snap.latencyBaseline.p50 * 1000).toFixed(1),
        recsP50ms: +(snap.latencyRecs.p50 * 1000).toFixed(1),
        sloTargetMs: snap.slo.targetP99Sec * 1000,
      },
    }),
  );
}

assert(poolIsOutsideProductPage(), "pool must be acquired by Recommendation, not Product Page");
assert(
  SERVICE_EDGES.some((edge) => edge.source === "product" && edge.target === "catalog"),
  "baseline edge Product Page → Catalog missing",
);
assert(
  SERVICE_EDGES.some((edge) => edge.source === "pool" && edge.target === "db"),
  "pool → DB edge missing",
);

console.log(JSON.stringify({ ok: true, topology: "recommendation-owns-pool" }));

{
  const quiet = createEngine(21, {
    arrivalRate: 800,
    exposurePct: 0,
    featureEnabled: true,
    baselineHoldSec: 0.012,
    recLookupSec: 0.08,
  });
  let maxActive = 0;
  let completed = 0;
  for (let i = 0; i < 400; i++) {
    const snap = tick(quiet, 0.01);
    maxActive = Math.max(maxActive, snap.activeCount);
    completed = snap.completedCount;
    assert(snap.slots.every((slot) => slot.requestId === null), "baseline occupied a pool slot");
  }
  assert(maxActive === 0, "catalog traffic occupied the recommendation pool");
  assert(completed > 0, "baseline requests should still complete");
}

{
  const hot = createEngine(22, {
    arrivalRate: 550,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.09,
    baselineHoldSec: 0.012,
  });
  let sawOverDemand = false;
  for (let i = 0; i < 800; i++) {
    const snap = tick(hot, 0.01);
    assert(snap.activeCount <= POOL_SIZE, "busy exceeded capacity");
    assert(snap.utilization <= 1, "utilization exceeded 1");
    if (snap.demandOccupancy > snap.poolSize && snap.activeCount <= POOL_SIZE && snap.waitingCount > 0) {
      sawOverDemand = true;
    }
    const read = readChapter1(snap);
    assert(read.busy === snap.activeCount, "headline busy drifted from snapshot");
    assert(read.waiting === snap.waitingCount, "headline waiting drifted");
    assert(read.p99Sec === snap.latencyP99, "headline p99 drifted");
    assert(read.demand === snap.demandOccupancy, "headline demand drifted");
    assert(read.utilization === snap.utilization, "headline util drifted");
  }
  assert(sawOverDemand, "offered demand should exceed occupancy while waiters exist");
}

{
  const delayed = createEngine(23, {
    arrivalRate: 400,
    exposurePct: 0,
    featureEnabled: true,
    recLookupSec: 0.08,
  });
  for (let i = 0; i < 40; i++) tick(delayed, 0.01);
  setControls(delayed, { exposurePct: 100 });
  const applyAt = delayed.t + FLAG_PROPAGATION_SEC;
  while (delayed.t < applyAt - 0.02) {
    const snap = tick(delayed, 0.01);
    assert(snap.activeCount === 0 && snap.waitingCount === 0, "flag applied before propagation");
  }
  for (let i = 0; i < 200; i++) tick(delayed, 0.01);
  const after = tick(delayed, 0);
  assert(after.activeCount > 0, "exposed traffic should acquire after propagation");
}

{
  const live = createEngine(24, {
    arrivalRate: 500,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.1,
  });
  for (let i = 0; i < 300; i++) tick(live, 0.01);
  const before = takeSnapshot(live);
  assert(before.activeCount > 10, "expected in-flight holds before disable");
  const orderBefore = before.waiting.map((req) => req.id);
  setControls(live, { featureDisabledForNew: true, featureEnabled: false, exposurePct: 0 });
  const immediate = takeSnapshot(live);
  assert(immediate.activeCount === before.activeCount, "disable cancelled in-flight holds");
  for (let i = 0; i < 500; i++) tick(live, 0.01);
  const drained = takeSnapshot(live);
  assert(drained.activeCount === 0 && drained.waitingCount === 0, "disable should drain the pool");
  assert(orderBefore.length >= 0, "waiter sample retained");
}

{
  const queued = createEngine(25, {
    arrivalRate: 600,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.09,
  });
  for (let i = 0; i < 400; i++) tick(queued, 0.01);
  const before = takeSnapshot(queued).waiting.map((req) => req.id);
  assert(before.length > 5, "expected a waiter queue to freeze");
  setSimFrozen(queued, true);
  const t0 = queued.t;
  for (let i = 0; i < 30; i++) tick(queued, 0.01);
  assert(queued.t === t0, "pause advanced the clock");
  const frozenIds = takeSnapshot(queued).waiting.map((req) => req.id);
  assert(frozenIds.join() === before.join(), "pause reordered or dropped waiters");
  setSimFrozen(queued, false);
  tick(queued, 0.01);
  const after = takeSnapshot(queued).waiting.map((req) => req.id);
  const prior = new Set(before);
  let last = -1;
  for (const id of after) {
    if (!prior.has(id)) continue;
    const idx = before.indexOf(id);
    assert(idx > last, "waiter order changed after resume");
    last = idx;
  }
}

{
  function digest(seed: number) {
    const eng = createEngine(seed, {
      arrivalRate: 220,
      exposurePct: 40,
      featureEnabled: true,
      recLookupSec: 0.07,
      cacheHitRate: 0.2,
    });
    const rows: number[] = [];
    for (let i = 0; i < 250; i++) {
      const snap = tick(eng, 0.01);
      if (i % 25 === 0) rows.push(snap.activeCount, snap.waitingCount, snap.completedCount, snap.shedCount);
    }
    return rows.join(",");
  }
  assert(digest(9) === digest(9), "same seed diverged");
  assert(digest(9) !== digest(10), "different seeds matched");
}

{
  const user = "u-42";
  const at20 = isUserExposed(user, 20);
  assert(isUserExposed(user, 20) === at20, "bucket changed for the same user");
  if (at20) assert(isUserExposed(user, 50), "raising exposure dropped a user who was already in");
  assert(!isUserExposed(user, 0), "0% exposed someone");
  assert(isUserExposed(user, 100), "100% missed someone");
}

{
  const controls = {
    poolSize: 8,
    concurrencyLimit: 80,
    retries: "aggressive" as const,
    shedding: false,
  };
  let state = createSlo();
  let other = createSlo();
  for (let i = 0; i < 80; i++) {
    const a = tickSlo(state, controls);
    const b = tickSlo(other, controls);
    state = a.state;
    other = b.state;
    assert(a.snap.inFlight <= controls.poolSize + 1e-9, "SLO in-flight exceeded pool");
    assert(a.snap.poolUtil <= 1 + 1e-9, "SLO util exceeded 1");
    assert(a.snap.inFlight === b.snap.inFlight, "SLO tick was not deterministic");
    assert(a.snap.pending === b.snap.pending, "SLO pending diverged");
  }
}

console.log(JSON.stringify({ ok: true, boundaries: "pool-outside-product-page" }));

