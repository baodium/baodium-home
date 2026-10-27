import {
  createEngine,
  setControls,
  tick,
  POOL_SIZE,
} from "../src/lib/experience/engine";

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

console.log(JSON.stringify({ ok: true }));
