import assert from "node:assert/strict";
import {
  createOperations,
  configureOperations,
  advanceOperations,
  gradeOperations,
  operationsWindow,
} from "../src/lib/sre/operations";
import {
  DEFAULT_RULE,
  evaluateAlertRule,
  parseAlertRule,
} from "../src/lib/sre/alert-rule";
import { runScene, createSreEngine, runSre } from "../src/lib/sre/engine";
import { defaultControls } from "../src/lib/sre/model";
import { seriesPath } from "../src/lib/sre/chart";
import { createEngine, advanceEngine } from "../src/lib/experience/engine";
import {
  attachCascade,
  cascadeView,
  healthyControls,
  gradeCascade,
} from "../src/lib/experience/cascade";

let capacity = createOperations("capacity");
assert.equal(
  gradeOperations(advanceOperations(capacity, 5)).ok,
  false,
  "Healthy baseline alone must not complete the incident",
);
capacity = advanceOperations(
  configureOperations(capacity, { arrivalRate: 600 }),
  10,
);
assert.ok(capacity.demonstrated);
assert.ok(operationsWindow(capacity).failed > 0);
const overloaded = capacity;
capacity = advanceOperations(
  configureOperations(capacity, { autoscale: true }),
  30,
);
assert.equal(
  gradeOperations(capacity).ok,
  true,
  gradeOperations(capacity).reason,
);
assert.ok(capacity.controls.replicas >= 6 && capacity.controls.replicas <= 12);
assert.equal(capacity.queue.length, 0);
let manual = advanceOperations(
  configureOperations(overloaded, { replicas: 8 }),
  10,
);
assert.equal(
  gradeOperations(manual).ok,
  true,
  "Manual scaling is also a valid mitigation",
);
manual = advanceOperations(
  configureOperations(overloaded, { arrivalRate: 20 }),
  10,
);
assert.equal(
  gradeOperations(manual).ok,
  false,
  "Reducing offered traffic does not meet the capacity objective",
);
let rollout = advanceOperations(
  configureOperations(createOperations("deployment"), { canaryPct: 50 }),
  8,
);
assert.ok(rollout.demonstrated && operationsWindow(rollout).failed > 0);
rollout = advanceOperations(configureOperations(rollout, { canaryPct: 0 }), 5);
assert.equal(gradeOperations(rollout).ok, true);
let repaired = advanceOperations(
  configureOperations(createOperations("deployment"), { canaryPct: 50 }),
  8,
);
repaired = advanceOperations(
  configureOperations(repaired, { releaseErrorPct: 0, canaryPct: 100 }),
  5,
);
assert.equal(
  gradeOperations(repaired).ok,
  true,
  "Repairing the release is also valid",
);
assert.deepEqual(
  advanceOperations(
    configureOperations(createOperations("deployment"), { canaryPct: 50 }),
    8,
  ),
  advanceOperations(
    configureOperations(createOperations("deployment"), { canaryPct: 50 }),
    8,
  ),
  "Seeded rollout replay must match",
);
const bounded = advanceOperations(
  configureOperations(createOperations("capacity"), { arrivalRate: 1000 }),
  300,
);
assert.ok(bounded.samples.length <= 60 && bounded.events.length <= 100);
assert.ok(bounded.queue.reduce((n, item) => n + item.count, 0) <= 500);
for (const scene of [
  "sustained",
  "short-spike",
  "missing-telemetry",
] as const) {
  const fixture = runScene(scene);
  const rows = evaluateAlertRule(fixture.state, fixture.controls, DEFAULT_RULE);
  assert.equal(
    rows.at(-1)?.state,
    scene === "sustained"
      ? "paging"
      : scene === "missing-telemetry"
        ? "no-data"
        : "quiet",
  );
}
const cpu = defaultControls({ cpu: 0.9 });
const shortCpu = runSre(createSreEngine(), cpu, 3);
assert.equal(
  evaluateAlertRule(shortCpu, cpu, {
    signal: "cpu",
    threshold: 0.8,
    forSeconds: 5,
  }).at(-1)?.state,
  "pending",
);
assert.equal(
  evaluateAlertRule(runSre(shortCpu, cpu, 4), cpu, {
    signal: "cpu",
    threshold: 0.8,
    forSeconds: 5,
  }).at(-1)?.state,
  "paging",
);
assert.throws(() =>
  parseAlertRule('{"signal":"cpu","threshold":80,"forSeconds":5}'),
);
assert.throws(() =>
  parseAlertRule('{"signal":"burn","threshold":14.4,"forSeconds":-1}'),
);
const path = seriesPath(
  [
    { t: 0, v: 0 },
    { t: 1, v: null },
    { t: 4, v: 0.5 },
  ],
  (row) => row.v,
  (t) => t,
  (v) => v,
);
assert.equal(
  path,
  "M0.00,0.00 M4.00,0.50",
  "Missing measurements must break the line, while zero remains valid",
);
const engine = createEngine(42);
attachCascade(engine, healthyControls());
advanceEngine(engine, 8);
assert.equal(
  gradeCascade(cascadeView(engine.cascade!, engine.t), {
    mode: "guided",
    demonstrated: false,
  }).ok,
  false,
);
console.log(
  "verify-sre-product: capacity, canary, recovery alternatives, seeded replay, bounded data, alert pending/paging/no-data and chart gaps ok",
);
