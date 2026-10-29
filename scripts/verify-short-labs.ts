/**
 * Short labs for chapters 2, 3, 4, 5, 7, 12, and 14.
 * Each challenge fails on the starting controls and passes on a worked setting.
 * Guided gates open in order. Challenge copy does not name the fix.
 */
import { SHORT_LABS, controlsFor } from "../src/lib/experience/short-labs/catalog";
import type { ControlValues, LabSim, LabSnapshot } from "../src/lib/experience/short-labs/types";

const DT = 0.25;
let failed = 0;

function fail(message: string) {
  console.error(message);
  failed += 1;
}

function run(sim: LabSim, controls: ControlValues, seconds: number): LabSnapshot {
  let snap = sim.step(null, controls, DT);
  const ticks = Math.round(seconds / DT);
  for (let i = 0; i < ticks; i += 1) snap = sim.step(snap, controls, DT);
  return snap;
}

function walkStrings(value: unknown, visit: (text: string) => void) {
  if (typeof value === "string") visit(value);
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, visit));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "sim") continue;
      walkStrings(child, visit);
    }
  }
}

const banned = ["—", "Training brief", "Debrief", "invariant"];
for (const lab of SHORT_LABS) {
  walkStrings(lab, (text) => {
    for (const word of banned) {
      if (text.includes(word)) fail(`${lab.slug} contains ${JSON.stringify(word)}: ${text.slice(0, 80)}`);
    }
  });
  const challenge = `${lab.challengeSituation} ${lab.challengeObjective} ${lab.challengeSuccess}`.toLowerCase();
  for (const leak of ["singleflight", "jitter", "outbox", "operation id", "propagate", "idempotent", "turn on", "enable the"]) {
    if (challenge.includes(leak)) fail(`${lab.slug} challenge copy names a fix: ${leak}`);
  }
}

const expectPass: Record<string, ControlValues> = {
  "chapter-2": { workers: 16 },
  "chapter-3": { idempotency: true, outbox: true },
  "chapter-4": { propagate: true, cancel: true },
  "chapter-5": { singleflight: true, jitter: true },
  "chapter-7": { route: "bound", lagBoundMs: 200 },
  "chapter-12": { consumers: 4, idempotent: true, ackBefore: false },
  "chapter-14": { inventoryCritical: false, retryExtra: 0, providerBudgetMs: 300, shedPct: 0 },
};

for (const lab of SHORT_LABS) {
  const locked = controlsFor(lab, "challenge");
  const missed = run(lab.sim, locked, 12);
  if (missed.challengePassed) fail(`${lab.slug} challenge passed on the starting controls`);
  const won = run(lab.sim, { ...locked, ...expectPass[lab.slug] }, 14);
  if (!won.challengePassed) {
    fail(`${lab.slug} challenge did not pass on the worked setting: ${won.challengeDetail}`);
  }
}

function untilGate(sim: LabSim, controls: ControlValues, snap: LabSnapshot, gate: string, seconds: number) {
  let cursor = snap;
  const ticks = Math.round(seconds / DT);
  for (let i = 0; i < ticks; i += 1) {
    cursor = sim.step(cursor, controls, DT);
    if (cursor.gates[gate]) return cursor;
  }
  return cursor;
}

const guided: { slug: string; steps: { controls: ControlValues; gate: string; seconds: number }[] }[] = [
  {
    slug: "chapter-2",
    steps: [
      { controls: {}, gate: "seen", seconds: 2 },
      { controls: { arrivalPerSec: 800 }, gate: "overCapacity", seconds: 2 },
      { controls: { arrivalPerSec: 800, retryFactor: 2 }, gate: "queued", seconds: 3 },
      { controls: { arrivalPerSec: 80, serviceMs: 15, workers: 30, retryFactor: 1 }, gate: "recovered", seconds: 8 },
    ],
  },
  {
    slug: "chapter-3",
    steps: [
      { controls: {}, gate: "timedOut", seconds: 3 },
      { controls: {}, gate: "duplicated", seconds: 2 },
      { controls: { idempotency: true }, gate: "identified", seconds: 4 },
      { controls: { idempotency: true, outbox: true }, gate: "recorded", seconds: 4 },
    ],
  },
  {
    slug: "chapter-4",
    steps: [
      { controls: {}, gate: "inside", seconds: 1 },
      { controls: { inventoryMs: 340 }, gate: "overrun", seconds: 1 },
      { controls: { inventoryMs: 340, propagate: true }, gate: "passedDown", seconds: 1 },
      { controls: { inventoryMs: 340, propagate: true, cancel: true }, gate: "stopped", seconds: 1 },
    ],
  },
  {
    slug: "chapter-5",
    steps: [
      { controls: {}, gate: "warm", seconds: 2 },
      { controls: { align: true }, gate: "stampede", seconds: 4 },
      { controls: { align: true, singleflight: true }, gate: "coalesced", seconds: 3 },
      { controls: { align: true, singleflight: true, jitter: true }, gate: "spread", seconds: 6 },
    ],
  },
  {
    slug: "chapter-7",
    steps: [
      { controls: {}, gate: "stale", seconds: 1 },
      { controls: { route: "primary" }, gate: "primaryOnly", seconds: 1 },
      { controls: { route: "bound", lagBoundMs: 200 }, gate: "bounded", seconds: 1 },
      { controls: { route: "bound", lagBoundMs: 200 }, gate: "held", seconds: 4 },
    ],
  },
  {
    slug: "chapter-12",
    steps: [
      { controls: {}, gate: "steady", seconds: 1 },
      { controls: { processMs: 100 }, gate: "aged", seconds: 16 },
      { controls: { processMs: 25, consumers: 4 }, gate: "scaled", seconds: 12 },
      { controls: { processMs: 25, consumers: 4, idempotent: true, ackBefore: false }, gate: "safe", seconds: 1 },
    ],
  },
  {
    slug: "chapter-14",
    steps: [
      { controls: {}, gate: "fits", seconds: 1 },
      { controls: { slowdown: true }, gate: "overBudget", seconds: 1 },
      { controls: { slowdown: true, inventoryCritical: false }, gate: "deferred", seconds: 1 },
      { controls: { slowdown: true, inventoryCritical: false, retryExtra: 0, shedPct: 0 }, gate: "reserved", seconds: 1 },
    ],
  },
];

for (const script of guided) {
  const lab = SHORT_LABS.find((item) => item.slug === script.slug);
  if (!lab) {
    fail(`missing lab ${script.slug}`);
    continue;
  }
  let controls = controlsFor(lab, "guided");
  let snap = lab.sim.step(null, controls, DT);
  for (const step of script.steps) {
    controls = { ...controls, ...step.controls };
    snap = untilGate(lab.sim, controls, snap, step.gate, step.seconds);
    if (!snap.gates[step.gate]) fail(`${script.slug} guided gate ${step.gate} did not open`);
  }
}

if (failed) {
  console.error(`verify-short-labs: ${failed} failure(s)`);
  process.exit(1);
}
console.log(`verify-short-labs: ${SHORT_LABS.length} labs ok`);
