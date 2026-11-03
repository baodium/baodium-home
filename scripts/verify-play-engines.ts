/**
 * Deterministic checks that Play drill engines follow the chapter's cause and effect.
 */
import { createCache, tickCache, CACHE_DURATION_S, CACHE_TICK_MS, type CacheControls } from "../src/lib/play/cache-roulette";
import { createSurge, tickSurge, SURGE_DURATION_S, SURGE_TICK_MS, type SurgeControls } from "../src/lib/play/traffic-surge";
import { createCascade, tickCascade, CASCADE_DURATION_S, CASCADE_TICK_MS, type CascadeControls } from "../src/lib/play/cascade";
import { createTail, tickTail, TAIL_DURATION_S, TAIL_TICK_MS, type TailControls } from "../src/lib/play/tail-latency";
import { createEngine, tick, DURATION_S, TICK_MS, POOL, type Controls } from "../src/lib/slo-watch";
import { createEngine as createCh1, setControls, tick as tickCh1, POOL_SIZE } from "../src/lib/experience/engine";

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
  return last!;
}

{
  const herd = runCache({ readers: 80, fresh: false, singleflight: false, permit: true });
  const calm = runCache({ readers: 80, fresh: false, singleflight: true, permit: true });
  assert(herd.snap.inFlightMisses > calm.snap.inFlightMisses, "a shared loader should cut catalog reads");
  assert(herd.state.stampededSec > calm.state.stampededSec, "separate loads should spend more time in a stampede");
  assert(calm.done?.outcome === "won", "one shared catalog read should pass");
  assert(herd.done?.outcome === "lost", "one read per reader should fail");
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
  const over = runSurge({ admitPerSec: 560 });
  const pass = runSurge({ admitPerSec: 400 });
  assert(over.state.peakP95 > pass.state.peakP95, "560/s should peak higher acquire p95 than 400/s");
  assert(pass.state.underBudgetSec > over.state.underBudgetSec, "the passing stage should spend more time inside the bar");
  assert(pass.done?.outcome === "won", "400/s should pass");
  assert(over.done?.outcome === "lost", "560/s should fail");
  assert(runSurge({ admitPerSec: 480 }).done?.outcome === "lost", "480/s rejects about 2 percent and should fail");
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
  const open = runCascade({ providerMs: 900, remainingMs: 500, reserveMs: 80, permit: true, cancel: false });
  const stopped = runCascade({ providerMs: 900, remainingMs: 500, reserveMs: 80, permit: true, cancel: true });
  assert(stopped.state.peakRisk < open.state.peakRisk, "cancellation should cut leftover provider work");
  assert(stopped.done?.outcome === "won", "cancellation with a permit should pass");
  assert(open.done?.outcome === "lost", "a provider left running should fail");
  assert(stopped.snap.health.edge >= open.snap.health.edge, "stopping the provider should leave checkout healthier");
}

function runTail(controls: TailControls) {
  let state = createTail(42);
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
  const hot = runTail({ lookupsPerSec: 560 });
  const calm = runTail({ lookupsPerSec: 400 });
  const again = runTail({ lookupsPerSec: 400 });
  assert(Math.abs(calm.snap.p95 - again.snap.p95) < 1e-6, "tail should be deterministic");
  assert(hot.snap.p95 > calm.snap.p95, "560/s should have a worse acquire p95 than 400/s");
  assert(calm.snap.p50 === 70 && hot.snap.p50 === 70, "the query should stay at 70 ms");
  assert(calm.done?.outcome === "won", "400/s should keep acquire p95 under 50 ms");
  assert(hot.done?.outcome === "lost", "560/s should miss the acquire bar");
  assert(calm.snap.cost === 1, "this drill does not send a second copy");
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
  const open = runSlo({ exposurePct: 100, flagOff: false });
  const stopped = runSlo({ exposurePct: 100, flagOff: true });
  const eased = runSlo({ exposurePct: 40, flagOff: false });
  assert(open.snap.inFlight <= POOL, "busy connections stay inside 40");
  assert(stopped.snap.pending < open.snap.pending, "the flag should leave fewer pending acquisitions");
  assert(stopped.done?.outcome === "won", "flag off should clear the pool");
  assert(eased.done?.outcome === "won", "lower exposure should leave spare connections for the burst");
  assert(open.done?.outcome === "lost", "full exposure through the burst should fail");
  assert(open.snap.concurrencyUtil === stopped.snap.concurrencyUtil, "the query does not change when the flag changes");
}

{
  const eng = createCh1(3, {
    arrivalRate: 550,
    exposurePct: 50,
    featureEnabled: true,
    recLookupSec: 0.09,
  });
  for (let i = 0; i < 500; i++) tickCh1(eng, 0.01);
  setControls(eng, { exposurePct: 100 });
  for (let i = 0; i < 200; i++) tickCh1(eng, 0.01);
  const beforeWait = tickCh1(eng, 0).waitingCount;
  assert(beforeWait > 0, "pressure setup should create waiters before pause");
  setControls(eng, { paused: true });
  setControls(eng, { exposurePct: 80 });
  assert(eng.controls.exposurePct === 80, "pause allows lowering exposure");
  setControls(eng, { exposurePct: 100 });
  assert(eng.controls.exposurePct === 80, "pause must freeze exposure increases");
  assert(eng.controls.arrivalRate === 550, "pause must not cut arrival rate");
  for (let i = 0; i < 100; i++) tickCh1(eng, 0.01);
  setControls(eng, {
    featureDisabledForNew: true,
    featureEnabled: false,
    exposurePct: 0,
    paused: false,
  });
  for (let i = 0; i < 400; i++) tickCh1(eng, 0.01);
  const drained = tickCh1(eng, 0);
  assert(drained.activeCount <= POOL_SIZE, "active never exceeds 40");
  assert(drained.waitingCount < beforeWait && drained.activeCount < 25, "disable should relieve pressure");
}

console.log("verify-play-engines: ok");
