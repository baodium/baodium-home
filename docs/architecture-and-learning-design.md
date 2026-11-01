# Architecture and learning design

How the Chapter 1 benchmark is built, and the rules later chapters have to share.

## Two tracks

Track A is the book. Fourteen chapters, manuscript prose in the reader, one operable incident per chapter when that chapter is actually built. Track B is the SRE drills under `/play`. A drill is a simulation until a real tool has run. This site does not claim kubectl, a shell, or a production database.

The workspace for a full lab is narrative, a topology that matches the sim, controls, and evidence. Guided, Practice, and Challenge are modes of one engine. Practice and Challenge are not extra stages, so “Step 1 of 8” stays eight stages.

## Service boundary for Chapter 1

```
Client → Product Page → Catalog                         baseline, ~12 ms, no pool slot
Client → Product Page → Recommendation → pool → DB      exposed users only
```

The pool has 40 slots and lives in Recommendation. Product Page may call Recommendation. It does not hold the connection. A cache hit on the recommendation path skips the acquire. A load shed sends that arrival back to Catalog.

## One discrete-event engine

`src/lib/experience/engine.ts` owns the math. React components render `EngineSnapshot`. They do not recompute latency or invent slots.

Each tick, in order:

1. If the clock is frozen and this is not a single step, return the same snapshot. The waiter list is not sorted or rebuilt.
2. Apply a flag change whose propagation time has arrived.
3. Release holders whose database hold has finished.
4. Time out waiters who have waited past `connectionTimeout`.
5. Give free slots to the existing queue, front first.
6. Spawn arrivals. They start on Product Page. They do not take a slot in the arrival tick.
7. Finish catalog legs that are due. Baseline, shed, and cache hits complete with caller time only. A recommendation miss acquires or joins the back of the queue.

Arrivals use a seeded mulberry32 generator. Feature-flag membership uses a stable hash of the user id (`src/lib/experience/rng.ts`), so the same user stays in or out as exposure rises. Construction applies the initial flag immediately. A later change waits `FLAG_PROPAGATION_SEC` (0.25s). In-flight holds are never cancelled to catch the flag up.

Little’s Law for the pool is admitted recommendation rate times recommendation hold. Catalog time is not `W`. Shed sets admitted rate to 0 while the gate is open. Offered lookups per second stay on the snapshot as `offeredPoolRps`, separate from `activeCount`.

## Same numbers

`readChapter1` in `src/lib/experience/readout.ts` is the projection the narrator, the pool grid, Little’s callout, the latency strip, the ops gauges, and challenge scoring all read. `requestTiming` splits one request into caller, acquire wait, and database hold. The trace and the stacked chart use that split. There is no leftover rest bucket.

Challenge pass is waiting cleared, utilization at or under 75%, and p99 under the 200 ms SLO, inside 45 sim seconds, after enough completions to make the percentiles real. The intro does not name the lever.

## Shared occupancy rule

`src/lib/sim/bounds.ts` clamps busy work to capacity and defines utilization as that busy work divided by capacity. Chapter 1 and SLO Watch both call it. A utilization figure does not climb past 1 by publishing a 41st slot. SLO Watch still models an edge concurrency limit beside the pool. Those two knobs can diverge. The pool knob cannot report more occupancy than it has slots.

## Shell

`LearningShell` is the chrome for labs and drills. Chapter 1 adds the workbench: scenario, live state, topology, controls, evidence. Play/pause sets `frozen` on the engine. Step forces one tick while frozen. Reset rebuilds the engine from the same seed and the mode’s starting controls.

Reduced motion removes the decorative transitions. The numbers, the queue, and the path remain.

## What is deliberately not shared yet

Chapter 3 has its own discrete-event ledger (`src/lib/experience/idempotency/engine.ts`), the same shape as Chapter 1: one clock, one readout, guided / practice / challenge. Chapters 2, 4, 5, 7, 12, and 14 still have short labs with their own tick functions. Traffic Surge, Cascade, Cache Roulette, and Tail Latency keep theirs. Folding those into the Chapter 1 pool engine would blur different incidents. The shared occupancy bound is still Chapter 1 and SLO Watch.
