# Current site audit

Audit of baodium.com as shipped in `baodium-home` on 2026-11-01, then corrected in this change where Chapter 1 disagreed with itself. Public URLs are unchanged.

## What the site is

Baodium is a static Next.js site. There is no database, no sign-in, and no hosted shell. The book, labs, and drills all run in the browser. Metrics on those pages are simulations. They are not live production telemetry, and the interface says so on the Chapter 1 ops panel (“Simulated”).

## Routes that must keep working

| Surface | URL | What a reader gets |
| --- | --- | --- |
| Home | `/` | Hero only: portrait, roles, one line, two links, nav. No page scroll. |
| Book | `/system-design` and `/system-design/[slug]` | Manuscript reader |
| Labs | `/system-design/experience` | Lab index |
| Chapter 1 lab | `/system-design/experience/chapter-1` | Full incident: guided, practice, challenge |
| Other labs | `/system-design/experience/chapter-2` and the short-lab slugs below | Shorter browser sims |
| Drills | `/play` and `/play/[slug]` | Five drills |
| Projects | `/projects` | Side projects |
| About | `/about` | Founder essay |

Navigation labels stay Home, Book, Labs, Drills, Projects, About. End-to-end tests lock those words. The learning brief’s “Experiences” and “SRE Labs” names are the same two destinations (`/system-design/experience` and `/play`). Renaming the labels is deferred so the shipped nav and the tests stay intact.

## Book

The reader ships 14 chapters plus preface, epilogue, appendices A–C, worksheet, glossary, further reading, index, and about the author. Appendix B is “Four Practical System Designs”. It is not chapter 15.

Chapter titles in `src/generated/book/manifest.json`:

1. Resource Contention in Production
2. Modeling Requests, Latency, and Throughput
3. State, Identity, and the Cost of Uncertainty
4. Service Communication and Cascading Failure
5. Caching and Data Freshness
6. Containers and the Reproducible Deployment
7. Replicas, Partitions, and Shards
8. Observability and Path Health
9. Guardrails and Failure Containment
10. Deployments as Controlled Experiments
11. Service Decomposition
12. Event-Driven Systems and Stream Processing
13. Machine Learning Systems in Production
14. Designing From Production Experience

The learning registry (`src/lib/learning/registry.ts`) lists labs for chapters 1, 2, 3, 4, 5, 7, 12, and 14. Chapters 6, 8, 9, 10, 11, and 13 have book routes and no lab card yet. That gap is honest: the lab index does not pretend those chapters are operable.

## Labs

Chapter 1 is the only full incident (eight guided stages, practice, challenge, shared clock). Short labs exist for chapters 2, 3, 4, 5, 7, 12, and 14. Each short lab is its own small sim, with its own chart and controls. They are labeled as labs, and they are still simulations.

## Five drills

All five keep their URLs and their own engines:

- `/play/slo-watch` — SLO Watch
- `/play/traffic-surge` — Traffic Surge
- `/play/cascade` — Cascade
- `/play/cache-roulette` — Cache Roulette
- `/play/tail-latency` — Tail Latency

SLO Watch is the drill migrated onto the shared occupancy rule in this change. The other four are untouched.

## Where Chapter 1 disagreed with itself

Before this change the prose, the service graph, and the code sample already said the same path: Product Page calls Catalog for the ordinary page, and personalized traffic goes Product Page → Recommendation → shared 40-connection pool → database. The discrete-event engine did not.

- Every arrival, including a catalog lookup, called `tryAcquire` and occupied a pool slot. Busy count mixed catalog time into the resource the story said Recommendation alone owns.
- Little’s Law used `baseline hold + exposure × recommendation hold` for every arrival. Offered pressure and occupancy were the same idea wearing two names.
- The request trace invented a 4 ms “rest” that the latency chart did not use, so the same completion showed two different splits.
- The live teaching card remounted whenever the sentence changed, the status dot pulsed, newly acquired slots flashed, and the guided progress mark pulsed. That reads as blinking while the numbers move.
- React Flow edges on the service graph marched continuously.
- “Replay” advanced the seed, so the button started a different incident.
- Flag changes applied on the same tick. In-flight work already survived a disable, which was right, but there was no propagation delay and the cohort update was instant.
- SLO Watch capped acquire correctly, then published pool utilization with a 1.25 ceiling, so the drill could report more than a full pool.

## What this change makes true

- Catalog completions never take a slot. Only a recommendation miss acquires, holds for the database lookup, and releases.
- Busy slots stay within 40. Demand `λ × W` may sit above 40. Waiters are the surplus.
- Caller time, acquire wait, and database hold are the same three numbers in the trace, the chart, the ops gauges, the narrator, and challenge scoring (`readChapter1`).
- A commanded flag reaches new arrivals after 0.25 sim seconds. Holds already in the pool finish. Pause freezes the clock and leaves the waiter queue in order.
- The same seed replays the same incident. The clock shows the seed.
- Motion in the lab is a fill change or a number update in place. The status dot, progress mark, slot acquire, and graph edges do not pulse or march.
- SLO Watch busy work and pool utilization use the same clamp. Utilization does not exceed 1. Offered arrivals stay a separate figure from in-flight work.

## Still out of scope

No hosted sandbox, no auth, no directory of all 14 chapters with progress, no full sims yet for chapters 3, 8, 12, and 14 beyond the short labs, no SRE catalogue beyond the five drills, no Appendix B lab. See `docs/implementation-plan.md`.
