/**
 * Deterministic checks that Play drill engines respond to controls
 * with engineer-credible cause → effect (not decorative knobs).
 */
import {
  createCache,
  tickCache,
  CACHE_DURATION_S,
  CACHE_TICK_MS,
  type CacheControls,
} from "../src/lib/play/cache-roulette";
import {
  createSurge,
  tickSurge,
  SURGE_DURATION_S,
  SURGE_TICK_MS,
  type SurgeControls,
} from "../src/lib/play/traffic-surge";
import {
  createCascade,
  tickCascade,
  CASCADE_DURATION_S,
  CASCADE_TICK_MS,
  type CascadeControls,
} from "../src/lib/play/cascade";
import {
  createTail,
  tickTail,
  TAIL_DURATION_S,
  TAIL_TICK_MS,
  type TailControls,
} from "../src/lib/play/tail-latency";
import {
  createEngine,
  tick,
  DURATION_S,
  TICK_MS,
  type Controls,
} from "../src/lib/slo-watch";
import {
  createEngine as createCh1,
  setControls,
  tick as tickCh1,
  POOL_SIZE,
} from "../src/lib/experience/engine";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function runCache(controls: CacheControls) {
  let state = createCache();
  let last = null as ReturnType<typeof tickCache> | null;
  const dt = CACHE_TICK_MS / 1000;
  const steps = Math.ceil(CACHE_DURATION_S / dt) + 2;
  for (let i = 0; i < steps; i++) {
    last = tickCache(state, controls, dt);
    state = last.state;
    if (last.done) break;
  }
  assert(!!last?.done, "cache should finish");
  return { done: last!.done!, peak: last!.state.peakOriginLoad, stampeded: last!.state.stampededSec };
}

{
  const herd = runCache({
    ttlSec: 4,
    singleflight: false,
    softTtl: false,
    originWorkers: 6,
  });
  const calm = runCache({
    ttlSec: 8,
    singleflight: true,
    softTtl: true,
    originWorkers: 12,
  });
  console.log(JSON.stringify({ cache: { herd, calm: { peak: calm.peak, stampeded: calm.stampeded, outcome: calm.done.outcome } } }, null, 2));
  assert(herd.peak > calm.peak, "singleflight+SWR should cut peak origin vs herd");
  assert(herd.stampeded > calm.stampeded, "herd should accumulate more stampede seconds");
  assert(calm.done.outcome === "won", "coalesced cache should be winnable");
}

function runSurge(controls: SurgeControls) {
  let state = createSurge();
  let last = null as ReturnType<typeof tickSurge> | null;
  const dt = SURGE_TICK_MS / 1000;
  const steps = Math.ceil(SURGE_DURATION_S / dt) + 2;
  for (let i = 0; i < steps; i++) {
    last = tickSurge(state, controls, dt);
    state = last.state;
    if (last.done) break;
  }
  assert(!!last?.done, "surge should finish");
  return last!;
}

{
  const drown = runSurge({ admit: 1, queueCap: 200, vipFirst: false });
  const shed = runSurge({ admit: 0.5, queueCap: 80, vipFirst: true });
  const shedNoVip = runSurge({ admit: 0.5, queueCap: 80, vipFirst: false });
  console.log(
    JSON.stringify(
      {
        surge: {
          drownPeak: drown.state.peakP95,
          shedUnderBudget: shed.state.underBudgetSec,
          vipOk: shed.snap.vipSuccessRate,
          vipOkNoPriority: shedNoVip.snap.vipSuccessRate,
          drownOutcome: drown.done?.outcome,
          shedOutcome: shed.done?.outcome,
        },
      },
      null,
      2,
    ),
  );
  assert(drown.state.peakP95 > shed.state.peakP95, "full admit should peak higher p95 than shedding");
  assert(shed.state.underBudgetSec > drown.state.underBudgetSec, "shedding should spend more time under budget");
  assert(shed.snap.vipSuccessRate > 0.65, "VIP-first should protect VIP success under shed");
  assert(
    shed.snap.vipSuccessRate > shedNoVip.snap.vipSuccessRate,
    "VIP-first must beat fair-share VIP success at the same admit rate",
  );
}

function runCascade(controls: CascadeControls) {
  let state = createCascade();
  let last = null as ReturnType<typeof tickCascade> | null;
  const dt = CASCADE_TICK_MS / 1000;
  const steps = Math.ceil(CASCADE_DURATION_S / dt) + 2;
  for (let i = 0; i < steps; i++) {
    last = tickCascade(state, controls, dt);
    state = last.state;
    if (last.done) break;
  }
  assert(!!last?.done, "cascade should finish");
  return last!;
}

{
  const open = runCascade({
    tripAt: 0.6,
    bulkheadAuth: false,
    bulkheadPay: false,
    timeoutMs: 250,
  });
  const contained = runCascade({
    tripAt: 0.2,
    bulkheadAuth: true,
    bulkheadPay: true,
    timeoutMs: 80,
  });
  const openOk =
    open.state.checkoutOk / Math.max(1, open.state.checkoutOk + open.state.checkoutFail);
  const containedOk =
    contained.state.checkoutOk /
    Math.max(1, contained.state.checkoutOk + contained.state.checkoutFail);
  console.log(
    JSON.stringify(
      {
        cascade: {
          openOk,
          containedOk,
          openEdge: open.state.health.edge,
          containedEdge: contained.state.health.edge,
          openPeakRisk: open.state.peakRisk,
          containedPeakRisk: contained.state.peakRisk,
        },
      },
      null,
      2,
    ),
  );
  assert(containedOk >= openOk - 0.01, "bulkheads+fail-fast+early trip should not hurt checkout ok");
  assert(
    contained.state.peakRisk < open.state.peakRisk,
    "isolation should cut peak cascade risk",
  );
  assert(contained.state.health.edge >= open.state.health.edge - 0.05, "isolation should protect edge health");
}

function runTail(controls: TailControls, seed = 42) {
  let state = createTail(seed);
  let last = null as ReturnType<typeof tickTail> | null;
  const dt = TAIL_TICK_MS / 1000;
  const steps = Math.ceil(TAIL_DURATION_S / dt) + 2;
  for (let i = 0; i < steps; i++) {
    last = tickTail(state, controls, dt);
    state = last.state;
    if (last.done) break;
  }
  assert(!!last?.done, "tail should finish");
  return last!;
}

{
  const tiny = runTail({
    concurrency: 8,
    hedge: false,
    hedgeAfterMs: 120,
    timeoutMs: 500,
  });
  const sized = runTail({
    concurrency: 36,
    hedge: true,
    hedgeAfterMs: 140,
    timeoutMs: 550,
  });
  // Same seed → deterministic; undersized pool should have worse p99.
  const a = runTail({ concurrency: 10, hedge: false, hedgeAfterMs: 100, timeoutMs: 600 }, 99);
  const b = runTail({ concurrency: 10, hedge: false, hedgeAfterMs: 100, timeoutMs: 600 }, 99);
  assert(Math.abs(a.snap.p99 - b.snap.p99) < 1e-6, "tail RNG should be deterministic per seed");
  console.log(
    JSON.stringify(
      {
        tail: {
          tinyP99: tiny.snap.p99,
          sizedP99: sized.snap.p99,
          sizedCost: sized.snap.cost,
          tinyUtil: tiny.snap.util,
        },
      },
      null,
      2,
    ),
  );
  assert(tiny.snap.p99 > sized.snap.p99, "more workers + careful hedge should cut p99");
  assert(tiny.snap.util > sized.snap.util, "tiny pool should show higher util");
}

function runSlo(controls: Controls) {
  let state = createEngine();
  let last = null as ReturnType<typeof tick> | null;
  const dt = TICK_MS / 1000;
  const steps = Math.ceil(DURATION_S / dt) + 2;
  for (let i = 0; i < steps; i++) {
    last = tick(state, controls, dt);
    state = last.state;
    if (last.done) break;
  }
  assert(!!last?.done, "slo should finish");
  return last!;
}

{
  const bad = runSlo({
    poolSize: 40,
    concurrencyLimit: 200,
    retries: "aggressive",
    shedding: false,
  });
  const good = runSlo({
    poolSize: 160,
    concurrencyLimit: 120,
    retries: "cautious",
    shedding: true,
  });
  console.log(
    JSON.stringify(
      {
        slo: {
          badOutcome: bad.done?.outcome,
          goodOutcome: good.done?.outcome,
          badBudget: bad.state.errorBudget,
          goodBudget: good.state.errorBudget,
          badPendingPeakish: bad.snap.pending,
          poolVsConc:
            bad.snap.poolUtil !== bad.snap.concurrencyUtil ||
            good.snap.poolUtil !== good.snap.concurrencyUtil,
        },
      },
      null,
      2,
    ),
  );
  assert(good.state.errorBudget > bad.state.errorBudget, "sized+shed+cautious should keep more budget");
  assert(bad.done?.outcome === "lost" || bad.state.errorBudget < good.state.errorBudget, "bad config should fare worse");
  // Dual knobs: pool util and concurrency util must be able to diverge.
  const dual = runSlo({
    poolSize: 50,
    concurrencyLimit: 180,
    retries: "off",
    shedding: false,
  });
  assert(
    dual.state.peakUtil > 0.5 || dual.snap.pending > 0,
    "concurrency ≫ pool should create pending or high pool util",
  );
}

// Chapter 1: pause freezes exposure raises; does not secretly cut λ.
{
  const eng = createCh1(3, {
    arrivalRate: 550,
    exposurePct: 50,
    featureEnabled: true,
    recLookupSec: 0.09,
  });
  for (let i = 0; i < 500; i++) tickCh1(eng, 0.01);
  // Raise to 100 under pressure, then pause and try to raise further (blocked).
  setControls(eng, { exposurePct: 100 });
  for (let i = 0; i < 200; i++) tickCh1(eng, 0.01);
  const beforeWait = tickCh1(eng, 0).waitingCount;
  assert(beforeWait > 0, "pressure setup should create waiters before pause");
  setControls(eng, { paused: true });
  setControls(eng, { exposurePct: 100 }); // same value ok
  setControls(eng, { exposurePct: 100 }); // no-op
  // Attempted raise while paused must stick at 100 — use a bogus >100 clamp path:
  // engine freezes increases, so patching 100→100 is fine; drop to 80 then try 100 while paused.
  setControls(eng, { exposurePct: 80 }); // lowering still allowed
  assert(eng.controls.exposurePct === 80, "pause allows lowering exposure");
  setControls(eng, { exposurePct: 100 }); // raise blocked
  assert(eng.controls.exposurePct === 80, "pause must freeze exposure increases");
  assert(eng.controls.arrivalRate === 550, "pause must not cut arrival rate");
  const frozenExposure = eng.controls.exposurePct;
  for (let i = 0; i < 100; i++) tickCh1(eng, 0.01);
  const after = tickCh1(eng, 0);
  assert(after.activeCount <= POOL_SIZE, "active never > 40 after pause");
  assert(frozenExposure === 80, "frozen exposure snapshot must remain 80");
  // Disable should drain recommendation demand.
  setControls(eng, {
    featureDisabledForNew: true,
    featureEnabled: false,
    exposurePct: 0,
    paused: false,
  });
  for (let i = 0; i < 400; i++) tickCh1(eng, 0.01);
  const drained = tickCh1(eng, 0);
  console.log(
    JSON.stringify(
      {
        ch1: {
          beforeWait,
          frozenExposure,
          afterDisableWait: drained.waitingCount,
          afterDisableActive: drained.activeCount,
        },
      },
      null,
      2,
    ),
  );
  assert(
    drained.waitingCount < beforeWait && drained.activeCount < 25,
    "disable should relieve pressure vs pre-pause waiters",
  );
}

console.log("verify-play-engines: ok");
