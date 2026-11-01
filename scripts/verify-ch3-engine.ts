/**
 * Chapter 3 ledger: one charge, one retry, pause order, seeded replay.
 * Headline counts and challenge scoring are the snapshot fields.
 */
import { CHAPTERS } from "../src/lib/learning/registry";
import { SHORT_LABS } from "../src/lib/experience/short-labs/catalog";
import { chapter3Copy } from "../src/lib/experience/scenarios/chapter-3";
import {
  CLIENT_TIMEOUT_MS,
  IDEMPOTENCY_LIMIT_MS,
  IDEMPOTENCY_WINDOW,
  SLOW_PROVIDER_MS,
  createIdempotencyEngine,
  setIdempotencyControls,
  setIdempotencyFrozen,
  stepIdempotency,
  tickIdempotency,
  type IdempotencyEngine,
  type SimEvent,
} from "../src/lib/experience/idempotency/engine";
import { readIdempotency } from "../src/lib/experience/idempotency/readout";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function run(engine: IdempotencyEngine, ms: number, dt = 50) {
  const ticks = Math.ceil(ms / dt);
  let snap = engine.cached;
  for (let i = 0; i < ticks; i += 1) snap = tickIdempotency(engine, dt);
  return snap;
}

function stepUntil(engine: IdempotencyEngine, pred: (event: SimEvent) => boolean, limit = 40) {
  for (let i = 0; i < limit; i += 1) {
    const next = engine.queue[0];
    if (!next) break;
    stepIdempotency(engine);
    if (pred(engine.events[engine.events.length - 1]!)) return engine.cached;
  }
  return engine.cached;
}

// Directory: 14 chapters, book-only chapters have no lab URL, chapter 3 is a full incident.
{
  assert(CHAPTERS.length === 14, "14 chapters");
  const numbers = CHAPTERS.map((chapter) => chapter.number);
  assert(
    numbers.join(",") === "1,2,3,4,5,6,7,8,9,10,11,12,13,14",
    "chapter numbers",
  );
  const bookOnly = CHAPTERS.filter((chapter) => chapter.labKind === "book");
  assert(bookOnly.length === 6, "six book-only chapters");
  for (const chapter of bookOnly) {
    assert(chapter.labHref === null, `${chapter.slug} has a lab href`);
    assert(chapter.labStatus === "none", `${chapter.slug} status`);
  }
  const full = CHAPTERS.filter((chapter) => chapter.labKind === "full").map((chapter) => chapter.slug);
  assert(full.join(",") === "chapter-1,chapter-3", "full incidents");
  assert(!SHORT_LABS.some((lab) => lab.slug === "chapter-3"), "chapter 3 is not a short lab");
  const drills = CHAPTERS.flatMap((chapter) => chapter.drills.map((drill) => drill.href));
  assert(drills.length === 5, "five drills");
}

// Seeded replay and pause order.
{
  const left = createIdempotencyEngine({ seed: 3, mode: "challenge" });
  const right = createIdempotencyEngine({ seed: 3, mode: "challenge" });
  run(left, 8000);
  run(right, 8000);
  assert(JSON.stringify(left.events) === JSON.stringify(right.events), "same seed replays");
  const other = createIdempotencyEngine({ seed: 9, mode: "challenge" });
  stepUntil(other, (event) => event.kind === "submit" && event.attempt === 1);
  assert(other.events.some((event) => event.operationId.includes("s9-")), "seed is in the operation id");

  const paused = createIdempotencyEngine({ seed: 3, mode: "challenge" });
  run(paused, 1000);
  const before = paused.cached.pending.map((event) => event.seq);
  const clock = paused.clock;
  const seen = paused.events.length;
  setIdempotencyFrozen(paused, true);
  tickIdempotency(paused, 50);
  tickIdempotency(paused, 50);
  assert(paused.clock === clock, "pause holds the clock");
  assert(paused.events.length === seen, "pause adds no events");
  assert(
    JSON.stringify(paused.cached.pending.map((event) => event.seq)) === JSON.stringify(before),
    "pause keeps queue order",
  );
  stepIdempotency(paused);
  assert(paused.events.length === seen + 1, "step runs one event");
  assert(paused.events[paused.events.length - 1]?.seq === before[0], "step runs the head event");
  const rest = paused.cached.pending.map((event) => event.seq);
  let cursor = 0;
  for (const seq of before.slice(1)) {
    const at = rest.indexOf(seq, cursor);
    assert(at >= cursor, "pause step reordered a queued event");
    cursor = at + 1;
  }
}

// A new id duplicates. The same id returns the stored charge. In-flight retries keep the id they leave with.
{
  const fresh = createIdempotencyEngine({ seed: 3, mode: "challenge" });
  const missed = run(fresh, 20000);
  assert(!missed.challengePassed, "challenge fails while retries use a new id");
  assert(missed.duplicateCharges > 0, "new ids duplicate");
  assert(missed.unresolved > 0, "timeouts stay unresolved");
  assert(missed.lostNotifications > 0, "notifications are lost");
  const read = readIdempotency(missed);
  assert(read.duplicateCharges === missed.duplicateCharges, "readout duplicates");
  assert(read.unresolved === missed.unresolved, "readout unresolved");
  assert(read.lostNotifications === missed.lostNotifications, "readout lost");
  assert(read.uniqueCharges === missed.uniqueCharges, "readout unique");

  const early = createIdempotencyEngine({ seed: 3, mode: "challenge" });
  setIdempotencyControls(early, { reuseOperationId: true, outbox: true });
  const won = run(early, 20000);
  assert(won.duplicateCharges === 0, "same id does not duplicate");
  assert(won.unresolved === 0, "same id clears the timeout");
  assert(won.lostNotifications === 0, "outbox keeps the notification");
  assert(won.cleanStreak >= IDEMPOTENCY_WINDOW, "clean streak");
  assert(won.challengePassed, "challenge passes on the worked setting");
  assert(won.controls.providerMs === SLOW_PROVIDER_MS, "challenge keeps provider time");
  setIdempotencyControls(early, { providerMs: 200, timeoutMs: 200 });
  assert(early.controls.providerMs === SLOW_PROVIDER_MS, "challenge locks provider time");
  assert(early.controls.timeoutMs === CLIENT_TIMEOUT_MS, "challenge locks timeout");

  const inflight = createIdempotencyEngine({ seed: 4, mode: "practice" });
  stepUntil(inflight, (event) => event.kind === "timeout" && event.attempt === 1);
  assert(inflight.queue[0]?.kind === "retry", "retry is the next event");
  setIdempotencyControls(inflight, { reuseOperationId: true });
  stepIdempotency(inflight);
  const flipped = inflight.checkouts[0]?.attempts[1];
  assert(flipped?.reusedIdentity === true, "a retry not yet sent takes the new setting");

  const sent = createIdempotencyEngine({ seed: 4, mode: "practice" });
  stepUntil(sent, (event) => event.kind === "submit" && event.attempt === 2);
  assert(sent.checkouts[0]?.attempts[1]?.reusedIdentity === false, "retry left with a new id");
  setIdempotencyControls(sent, { reuseOperationId: true });
  run(sent, 4000);
  const first = sent.checkouts[0];
  assert(first?.attempts[1]?.reusedIdentity === false, "a retry already sent keeps its operation id");
  assert(charges(sent, 1) === 2, "that checkout still settles two charges");
}

function charges(engine: IdempotencyEngine, checkoutId: number) {
  return engine.charges.filter((charge) => charge.checkoutId === checkoutId).length;
}

// Guided path opens in order on the shared engine.
{
  const guided = createIdempotencyEngine({ seed: 3, mode: "guided" });
  run(guided, 2000);
  assert(guided.cleanFits >= 1, "a fast checkout finishes");
  assert(guided.cached.duplicateCharges === 0, "the fast path does not duplicate");
  setIdempotencyControls(guided, { providerMs: SLOW_PROVIDER_MS });
  run(guided, 8000);
  const slow = readIdempotency(guided.cached);
  assert(slow.timedOut, "the slow provider times out");
  assert(slow.duplicated, "a new id duplicates");
  setIdempotencyControls(guided, { reuseOperationId: true });
  run(guided, 8000);
  assert(readIdempotency(guided.cached).identified, "a later retry reuses the id");
  setIdempotencyControls(guided, { outbox: true });
  run(guided, 8000);
  assert(readIdempotency(guided.cached).recorded, "a later charge writes the outbox");
}

// Challenge copy names the outcome and the time limit, and leaves the levers unnamed.
{
  const challenge = `${chapter3Copy.challenge.situation} ${chapter3Copy.challenge.objective} ${chapter3Copy.challenge.success} ${chapter3Copy.challenge.gettingStarted}`.toLowerCase();
  for (const leak of ["operation id", "outbox", "turn on", "idempotent", "enable the"]) {
    assert(!challenge.includes(leak), `challenge names ${leak}`);
  }
  assert(chapter3Copy.challenge.success.includes(String(IDEMPOTENCY_LIMIT_MS / 1000)), "limit is the engine limit");
  assert(chapter3Copy.challenge.success.includes(String(IDEMPOTENCY_WINDOW)), "window is the engine window");
  const blob = JSON.stringify(chapter3Copy);
  for (const word of ["—", "Training brief", "Debrief", "invariant"]) {
    assert(!blob.includes(word), `copy contains ${word}`);
  }
}

console.log(
  JSON.stringify(
    {
      chapter3: "ok",
      chapters: CHAPTERS.length,
      window: IDEMPOTENCY_WINDOW,
      limitMs: IDEMPOTENCY_LIMIT_MS,
    },
    null,
    2,
  ),
);
