# Tasks

Status for the learning platform. Phase 0, the Chapter 1 slice, the 14-chapter directory, and the Chapter 3 incident are in the tree. Later phases are open.

## Done

- [x] Phase 0 audit: `docs/current-site-audit.md`, `docs/architecture-and-learning-design.md`, `docs/implementation-plan.md`, `docs/content-provenance.md`
- [x] Chapter 1 engine: catalog path does not occupy the recommendation pool
- [x] Busy slots stay within 40; offered demand may exceed 40
- [x] One readout for headline, live status, and challenge scoring
- [x] Stable flag buckets, 0.25s propagation, in-flight holds continue
- [x] Pause freezes the clock and keeps waiter order; replay uses the same seed
- [x] Chapter 1 guided, practice, and challenge on that engine
- [x] Lab motion no longer pulses the live card, the progress mark, the slot, or the graph edge
- [x] SLO Watch uses the shared occupancy clamp (`/play/slo-watch`)
- [x] `npm run verify:ch1`, `npm run verify:play`, and `npm run typecheck`
- [x] Phase 3: directory of all 14 chapters, honest status (full incident, short lab, or in the book), reader links, local progress, no sign-in
- [x] Phase 4 start: Chapter 3 idempotency on the discrete-event ledger (`npm run verify:ch3`)

## Open

- [ ] Phase 4 remainder: full sims for chapters 8, 12, and 14
- [ ] Phase 5: remaining chapters, no empty templates
- [ ] Phase 6: browser labs for pod readiness, tracing, and incident triage, labeled as simulations
- [ ] Phase 7: Appendix B and polish
- [ ] Hosted sandboxes, auth, and arbitrary learner code stay blocked until a separate security review

## Preserved

- Book routes under `/system-design`
- `/system-design/experience`, `/system-design/experience/chapter-1`, and `/system-design/experience/chapter-3`
- `/play` and the five drill URLs
- Nav labels Home, Book, Labs, Drills, Projects, About
