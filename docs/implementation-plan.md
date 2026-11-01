# Implementation plan

Phases follow the learning brief. This change finishes Phase 0 and a tested Phase 1–2 slice. Later phases stay listed so the next session does not reopen them by accident.

## Phase 0 — Audit and stabilize

Done in this change.

- `docs/current-site-audit.md`
- `docs/architecture-and-learning-design.md`
- `docs/implementation-plan.md`
- `docs/content-provenance.md`
- `TASKS.md`
- Engine boundaries covered by `npm run verify:ch1` and `npm run verify:play`

## Phase 1 — Shared shell and engine

Done for the vertical slice.

- Learning shell already wraps labs and drills. URLs unchanged.
- Chapter 1 runs on one deterministic engine. Catalog time and pool occupancy are different states.
- SLO Watch, the Chapter 1 drill, uses the same busy-within-capacity rule. Its URL stays `/play/slo-watch`.
- The other four drills stay on their own engines.

## Phase 2 — Chapter 1 benchmark

Done for the acceptance checks that can run without a hosted environment.

- Guided stages A–H, Practice, and Challenge on the same engine.
- Evidence: pool grid, Little’s demand versus busy, latency split, ops gauges, request trace.
- Pause does not advance the clock or reorder waiters. Seeded replay repeats the incident.
- Flag: stable buckets, 0.25s propagation, in-flight holds continue.
- Motion stays put: no pulsing status dot, no flashing slot, no marching edge, no remounting live card.
- `prefers-reduced-motion` still has the controls and the state.
- Mobile layout remains the existing stacked workbench. A desktop and a narrow viewport are part of the manual pass for this change.

## Phase 3 — Directory of all 14

Done in the curriculum slice.

- `/system-design/experience` lists chapters 1 through 14.
- Status is one of: full incident (1 and 3), short lab (2, 4, 5, 7, 12, 14), or in the book (6, 8, 9, 10, 11, 13).
- Every title links to the chapter in the reader. A lab link appears only when that lab exists. Book-only chapters do not get a playable placeholder.
- The reader says "Operate this incident" for a full incident and "Open the short lab" for a short lab.
- Progress is `localStorage` (`baodium-learning-directory-v1` plus the existing book reader key). No sign-in.

## Phase 4 — Real sims for chapters 3, 8, 12, and 14

Chapter 3 is the first full incident after Chapter 1. Chapters 8, 12, and 14 are still open. Chapter 8 has no lab. Chapters 12 and 14 remain short labs.

Chapter 3 runs a discrete-event ledger in `src/lib/experience/idempotency/engine.ts`. One checkout, one client timeout, one retry. A repeated operation id returns the stored charge. A new id starts another provider call. The notification is chosen when the charge is created. Pause holds the queue order. Replay uses the same seed. `readIdempotency` is the projection for the headline, the narration, the graph, and the challenge streak. Guided, practice, and challenge are modes. The graph uses the labeled request edges from the architecture nodes.

## Phase 5 — Remaining chapters

Not in this change. Chapters 2, 4, 5, 6, 7, 9, 10, 11, and 13 still need real sims when their turn comes. Empty templates are not a substitute.

## Phase 6 — SRE path

Not in this change. The brief asks for three strong browser labs after the book benchmark: pod readiness, tracing, incident triage. Build those as simulations and label them as simulations. Do not claim a cluster command ran.

## Phase 7 — Appendix B and polish

Not in this change. Appendix B stays an appendix. No hosted multi-user shell, no auth, no arbitrary learner code on the deployment or against a production database, until a separate security review says otherwise.

## Checks before calling a page done

- `npm run verify:ch1`
- `npm run verify:ch3`
- `npm run verify:play`
- `npm run verify:labs`
- `npm run typecheck`
- Chapter 1 guided path in the browser: pause, step, replay, and the service path reading Product → Recommendation → pool → database
- Practice and Challenge reachable after the guided decision
- Narrow viewport still shows the scenario and the pool
