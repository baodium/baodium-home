import {
  createEngine,
  setControls,
  tick,
  POOL_SIZE,
} from "../src/lib/experience/engine";

const eng = createEngine(7, {
  arrivalRate: 550,
  exposurePct: 100,
  featureEnabled: true,
  recLookupSec: 0.09,
  baselineHoldSec: 0.012,
});

let maxActive = 0;
let maxWait = 0;
for (let i = 0; i < 200; i++) {
  const snap = tick(eng, 0.05);
  maxActive = Math.max(maxActive, snap.activeCount);
  maxWait = Math.max(maxWait, snap.waitingCount);
  if (snap.activeCount > POOL_SIZE) {
    console.error("INVARIANT FAIL: active > pool", snap.activeCount);
    process.exit(1);
  }
}

console.log(
  JSON.stringify(
    {
      ok: maxActive <= POOL_SIZE && maxWait > 0,
      maxActive,
      maxWait,
      poolSize: POOL_SIZE,
      littles: tick(eng, 0).littles,
    },
    null,
    2,
  ),
);

if (maxActive > POOL_SIZE || maxWait === 0) process.exit(1);

// Disable semantics: new traffic baseline, in-flight can still hold
setControls(eng, { featureDisabledForNew: true, featureEnabled: false, exposurePct: 0 });
const before = [...eng.slots].filter(Boolean).length;
for (let i = 0; i < 40; i++) tick(eng, 0.05);
const afterWaitingTrend = tick(eng, 0).waitingCount;
console.log(
  JSON.stringify({
    disableCheck: true,
    slotsBusyAtDisable: before,
    waitingAfterDrainWindow: afterWaitingTrend,
  }),
);
