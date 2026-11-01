# Tasks

Status for the learning platform. Phase 0 and the Phase 1–2 vertical slice are in this branch. Later phases are open.

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

## Open

- [ ] Phase 3: directory of all 14 chapters, honest status, reader links, local progress, no sign-in
- [ ] Phase 4: full sims for chapters 3, 8, 12, and 14
- [ ] Phase 5: remaining chapters, no empty templates
- [ ] Phase 6: browser labs for pod readiness, tracing, and incident triage, labeled as simulations
- [ ] Phase 7: Appendix B and polish
- [ ] Hosted sandboxes, auth, and arbitrary learner code stay blocked until a separate security review

## Preserved

- Book routes under `/system-design`
- `/system-design/experience` and `/system-design/experience/chapter-1`
- `/play` and the five drill URLs
- Nav labels Home, Book, Labs, Drills, Projects, About
