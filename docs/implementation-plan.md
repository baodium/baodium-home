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

Not in this change.

- One index of all 14 chapters with an honest status: book only, short lab, or full incident.
- Reader links from each chapter into the lab that exists.
- Progress stored locally, with no required sign-in.
- Chapters 6, 8, 9, 10, 11, and 13 are book-only today. The directory should say that in the open, instead of hiding them.

## Phase 4 — Real sims for chapters 3, 8, 12, and 14

Not in this change. Short labs exist for 3, 12, and 14. They are not the full incident shape (guided story, topology matched to state, challenge with exact criteria on the shared engine). Chapter 8 has no lab.

## Phase 5 — Remaining chapters

Not in this change. Chapters 2, 4, 5, 6, 7, 9, 10, 11, and 13 still need real sims when their turn comes. Empty templates are not a substitute.

## Phase 6 — SRE path

Not in this change. The brief asks for three strong browser labs after the book benchmark: pod readiness, tracing, incident triage. Build those as simulations and label them as simulations. Do not claim a cluster command ran.

## Phase 7 — Appendix B and polish

Not in this change. Appendix B stays an appendix. No hosted multi-user shell, no auth, no arbitrary learner code on the deployment or against a production database, until a separate security review says otherwise.

## Checks before calling a page done

- `npm run verify:ch1`
- `npm run verify:play`
- `npm run typecheck`
- Chapter 1 guided path in the browser: pause, step, replay, and the service path reading Product → Recommendation → pool → database
- Practice and Challenge reachable after the guided decision
- Narrow viewport still shows the scenario and the pool
