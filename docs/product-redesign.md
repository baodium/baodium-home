# Baodium product redesign

> Homepage direction superseded by the user’s November 10 correction: the original portrait homepage is restored. The new real-tool course and its validation are described in [Observability course](observability-course.md). Earlier homepage performance results and scores below describe commit 0447cfb, not the restored homepage.

## Phase A — baseline and architecture

The November 3 brief supersedes the previous hero-only homepage direction. Preserve the book's 14 numbered chapters, all manuscript content, and existing URLs. This implementation extends the current Next.js application and browser simulators; it does not add an execution backend or claim to run real infrastructure.

### Confirmed findings

- Home is locked to one viewport and exposes only two learning links. The SRE product, curriculum, book overview, projects and author context are not discoverable from its content.
- The SRE catalog has four functioning labs but no difficulty, duration, prerequisites, filtering, completion state or beginner sequence.
- The cascade reference lab gives a full viewport to four widely spaced services. Configuration and telemetry begin below that viewport, separating evidence from actions.
- Its trend chart plots absent success samples as zero, has no time labels, and omits checkout latency despite using latency to explain the incident.
- Configuration changes are not retained in the incident history. Evaluation returns a sentence without a persistent completion record or evidence report.
- The book contents lists titles without chapter descriptions. Its cover is small; the connection to the full chapter curriculum is indirect.
- SRE chrome repeats full navigation and sibling links, while the cascade page adds a second sibling menu.

### Design judgments

The warm charcoal, cream, copper and teal palette is a strong existing identity. Retain it. Use large editorial type for product introductions and compact sans-serif/monospace technical surfaces. Prefer dividers and distinct section compositions to repeated rounded cards. The four-service topology needs explicit dependency direction and selection, rather than a new graph library.

### Inventory to retain

- Next.js app routes; ReaderProvider, reader themes, outline, search and return-to-reading links.
- Chapter registry and generated manuscript as canonical chapter sources.
- Shared seeded engine and cascade projections for metrics, spans, logs and assessment.
- Existing SRE instrumentation, SLO and alert engines and four lab routes; all five drills.
- Navigation, Footer, ServiceMark and typed simulation contracts.

### Revised information architecture and journeys

Home introduces the product, offers a small real-simulator experiment, distinguishes System Design and SRE, then connects the book, featured labs, projects and author. Book remains at `/system-design`; chapter labs remain at `/system-design/experience`. `/sre-labs` becomes a filterable four-lab curriculum with honest prerequisites and local progress. `/play` remains directly accessible for short drills.

Primary journeys: Home → experiment → reference lab; Book → chapter → lab → return to reading; SRE catalog → instrument → SLO → alerts → cascade; reference lab → inspect → configure → step → evaluate → review.

### Shared foundations

Add scoped product tokens and reusable catalog/progress contracts. Keep calculations separate from rendering. Use the existing eight-slot cascade simulator for the homepage preview. Progress is local to this browser and completion requires assessment. Catalog filters never imply that unimplemented courses exist.

### Delivery and evidence

Implement in staged groups: foundations/home/book, catalog/progress, reference workspace, QA. Capture before/after desktop and mobile views and two visual passes. Validate routes, state transitions, telemetry gaps, configuration effects, keyboard controls and responsive overflow. Record measured results and remaining limitations below when verification completes.

## Delivered — November 10, 2026

### Foundations, homepage and book

The homepage is a scrollable product introduction with a real, bounded checkout experiment, two learning destinations, the book, selected lessons, projects and author context. It uses warm charcoal, copper, cream and forest tones, restrained editorial typography and distinct section compositions. The dark homepage pill and the newer shared site header are retained. Chapters 1–7 remain free; later content retains the full-edition boundary. Contents now includes concise chapter descriptions and a more prominent cover. Ten stale concept anchors and the overview's return-to-reading anchor were aligned to the current manuscript without rewriting it.

### Curriculum and operational labs

The SRE catalog now contains six working browser labs: instrumentation, SLOs, alerting, cascading failures, capacity/autoscaling and canary deployments. Topic, difficulty, duration and prerequisite filters work together and have an explicit empty state. Recommended prerequisites never lock experienced learners out. Opening a lab records a visit; only a successful assessment records completion. Progress is local, resilient to blocked storage, and tracked by mode.

The new capacity model has FIFO request accounting, bounded waiting, queue expiry, rejected arrivals, manual replica changes and an autoscaler. The canary model assigns individual requests using a reproducible seed and supports rollback or repair. Both distinguish offered, queued and completed requests, retain bounded evidence, replay recorded operations, and assess actual recovery. They share one reusable operations engine and interface rather than duplicating each lab.

### Reference workspace and alert experiments

The cascade workspace now groups mission, topology, inspection, configuration and evidence. It supports light/dark surfaces, adjustable guidance width, focus mode, mobile panels, keyboard-operable telemetry tabs, topology zoom/pan/fit and service inspection. Charts identify units and time, provide exact measurement tables, show latency and leave missing observations empty. Configuration actions are timestamped; replay reconstructs the run using the same seed and fixed simulation ticks. Logs filter by service, event and text/trace ID. Evaluation pauses the current clock and generates an evidence review with optional learner notes.

The alert practice extension supports editable, validated JSON and synchronized visual controls. Its rule replay evaluates CPU or two burn-rate windows, including sustained pending states, paging, quiet and missing-data outcomes. Transitions come from retained scenario measurements. The fixed guided assessment remains distinct from the custom rule experiment.

### Technical corrections

- Guided cascade completion requires observing amplification before recovery, preventing completion on an untouched healthy fixture.
- Cancelled scheduled-event IDs are removed when consumed and pruned when no longer pending.
- Live cascade rendering is throttled to ten updates per second; deterministic fixed ticks preserve replay at different playback speeds.
- SRE charts no longer bridge absent measurements or represent absence as zero.
- Chapter 1's newer story component initializes its imperative engine once, restores progress before mounting the session, derives its view from the active beat, and updates animation refs outside rendering. Its embedded lab remains reachable through the story's Pool act.
- Product and workspace styles are separated; no production dependencies, backend, authentication system or deployment platform were added.

## Validation and evidence

The production build, lint and TypeScript checks passed. All 48 Playwright tests passed against the production server, including both new lab recoveries, replay, the instrumentation-to-SLO journey, filters, custom alert validation, mobile panel switching, topology keyboard controls and the seven-chapter reading boundary. Existing drill, Chapter 1/3, short-lab, cascade, SRE and concept verification scripts passed. The new `verify:sre-product` checks alternate valid recoveries, rejected/queued accounting, seeded replay, retained-data bounds, alert pending/paging/no-data and chart gaps.

Automated axe checks reported zero violations on seven surfaces at 390px and 1440px, and on all four telemetry tabs during a dark-theme incident. These checks are not a WCAG certification or a substitute for user testing and screen-reader review. Thirty route/viewport combinations were checked for horizontal overflow at 375, 390, 768, 1024, 1440 and 1920px.

Two deliberate visual passes covered the homepage, catalog, reader and lab. Refinements included mobile topology label size, separate mobile Mission/System/Policy panels, metric-note alignment, removal of a long header entrance, forest configuration panels, dark-theme contrast and keyboard-scrollable logs. See [the evidence index](review/README.md) for screenshots, measurements and the provisional scorecard.

Four fresh-context local Chromium runs per profile measured homepage LCP p75 at 40ms on the local desktop and 1,440ms with 4× CPU slowdown, 150ms latency and 1.6Mbps download. Observed single-interaction duration p75 was 40ms/96ms respectively; observed CLS was zero. These are laboratory measurements against a local server, not field Core Web Vitals or field INP. The raw methodology and runs are in `review/performance.json`.

## Model boundaries and remaining product depth

The capacity model adapts the Kubernetes HPA ratio formula but checks every five seconds, assumes immediate readiness and scales up only. It does not implement a real Kubernetes control plane, startup delays or downscaling stabilization. The canary model has an error-free stable release, configurable canary failures and no request-latency model. The alert editor supports its documented JSON schema rather than full PromQL, and replays current rule/SLI settings over retained measurements. It does not deliver notifications or implement Alertmanager routing. The instrumentation lab teaches signal relationships; it does not run an OpenTelemetry SDK/exporter. Existing external Chapter 1 lab-runner integration is preserved; its remote availability is not established by the browser-model tests.

Further curriculum depth, real isolated execution environments, cross-device progress, full screen-reader testing and representative field performance remain future work. User hypotheses are retained only in the current run and are not automatically graded. Replay recording is bounded and explicitly disables replay when its action limit is reached. Original public routes and manuscript content remain intact.

Primary technical references: [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/), [Prometheus alerting-rule pending semantics](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/), and [Kubernetes HPA algorithm](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/). The browser models intentionally document where they simplify those systems.
