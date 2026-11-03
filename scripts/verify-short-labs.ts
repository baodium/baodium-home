/**
 * Short labs for chapters 2, 4, 5, 7, 12, and 14.
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
  "chapter-2": { holdDuringBuild: false },
  "chapter-4": { cancel: true },
  "chapter-5": { singleflight: true },
  "chapter-7": { route: "router", allowPrimaryFallback: true },
  "chapter-12": { consumers: 4, claim: true },
  "chapter-14": { perInstance: 20 },
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
      { controls: {}, gate: "estimate", seconds: 1 },
      { controls: { payloadMs: 40 }, gate: "over", seconds: 1 },
      { controls: { payloadMs: 40 }, gate: "queued", seconds: 4 },
      { controls: { payloadMs: 40, holdDuringBuild: false }, gate: "released", seconds: 8 },
    ],
  },
  {
    slug: "chapter-4",
    steps: [
      { controls: {}, gate: "inside", seconds: 1 },
      { controls: { providerMs: 900 }, gate: "overrun", seconds: 1 },
      { controls: { providerMs: 900, cancel: true }, gate: "stopped", seconds: 1 },
      { controls: { providerMs: 900, permit: false }, gate: "deferred", seconds: 1 },
    ],
  },
  {
    slug: "chapter-5",
    steps: [
      { controls: {}, gate: "warm", seconds: 2 },
      { controls: { fresh: false }, gate: "stampede", seconds: 1 },
      { controls: { fresh: false, singleflight: true }, gate: "coalesced", seconds: 1 },
      { controls: { fresh: false, singleflight: true, permit: false }, gate: "limited", seconds: 1 },
    ],
  },
  {
    slug: "chapter-7",
    steps: [
      { controls: {}, gate: "stale", seconds: 1 },
      { controls: { route: "router" }, gate: "refused", seconds: 1 },
      { controls: { route: "router", allowPrimaryFallback: true }, gate: "current", seconds: 1 },
      { controls: { route: "router", lagMs: 0, allowPrimaryFallback: false }, gate: "caughtUp", seconds: 1 },
    ],
  },
  {
    slug: "chapter-12",
    steps: [
      { controls: {}, gate: "steady", seconds: 1 },
      { controls: { processMs: 100 }, gate: "aged", seconds: 16 },
      { controls: { processMs: 25, consumers: 4 }, gate: "scaled", seconds: 12 },
      { controls: { processMs: 25, consumers: 4, claim: true, commitAfter: true }, gate: "safe", seconds: 1 },
    ],
  },
  {
    slug: "chapter-14",
    steps: [
      { controls: {}, gate: "baseline", seconds: 1 },
      { controls: { extraPct: 25, occupancyMs: 18 }, gate: "planning", seconds: 1 },
      { controls: { extraPct: 25, occupancyMs: 18, instances: 4, perInstance: 20 }, gate: "fleet", seconds: 1 },
      { controls: { extraPct: 25, occupancyMs: 18, instances: 4, perInstance: 20, instanceDown: true }, gate: "survivor", seconds: 1 },
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
