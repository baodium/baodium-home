# Focused SRE update — November 10, 2026

## Scope correction

The homepage is restored to the exact page composition before 0447cfb: portrait hero, roles, two direct reading/lab links, floating dark navigation and a single viewport. The unused product homepage component, preview simulation and its global stylesheet have been removed. Shared product primitives now live under the SRE components, so they do not redefine the homepage.

The improvement effort is concentrated on the laboratories. Existing six browser simulations remain a clearly separate practice path. The primary SRE entry now leads to a real local observability course.

## Eight exercises, one running system

The user-provided [Observability Course Labs](https://observability.courselabs.co/) informed the lesson structure: prerequisites, concrete task, expected artifact, hint, independent exercise and cleanup. All application source, configurations, commands and lesson copy in this kit are Baodium's own implementation.

1. Run the local stack and prove readiness.
2. Inspect real counters, in-flight work and latency histograms.
3. Query request rate, error ratio and tail latency with PromQL.
4. Inspect and extend a Grafana dashboard.
5. Follow a trace across Express and FastAPI.
6. Correlate structured service logs by trace ID.
7. Trigger and modify a real Prometheus alert.
8. Diagnose a timeout, recover the service and verify the rolling window.

Every lesson is independently reachable at `/sre-labs/observability/[lesson]`. It includes the objective, three operational tasks, expected observations, copyable commands, an evidence checkpoint, a troubleshooting hint, a reflection task, official references and project-scoped cleanup. Mobile course contents collapse behind a keyboard-operable button. Tool links open the default local interfaces after the learner starts the stack.

## What actually executes

The downloadable `public/downloads/baodium-observability-lab.zip` includes:

- Node.js/Express checkout with real Prometheus counters, gauge and histogram, plus OpenTelemetry server/client spans.
- Python/FastAPI payment service with configurable delay/failure injection, W3C context extraction and OTLP span export.
- Prometheus scraping and two actual alert rules, including missing-target handling.
- Grafana with a provisioned Prometheus data source and four decision-oriented dashboard panels.
- Jaeger with bounded in-memory storage and the current v3 query API.
- A dependency-free Node CLI that starts/stops only this Compose project, generates bounded concurrent requests, controls faults, queries tools and writes checkpoint reports.

Published ports bind to loopback. Grafana's anonymous Editor access is explicitly a local exercise configuration. The kit does not use production credentials or provision cloud infrastructure. Node 20+ is needed for the host CLI; the checkout container uses Node 22 for its SDK. Application dependencies and tool image versions are pinned in the kit.

## Execution evidence

The five-container stack was built and run using Docker, with a separate `baodium-observability-qa` project name. Verification exercised actual tool APIs and actual inter-service HTTP calls:

- All interfaces became ready; Prometheus scraped real request counters.
- Grafana served its provisioned dashboard and successfully queried the configured Prometheus data source.
- A Jaeger trace contained connected checkout/client/payment spans across both application frameworks, with the same trace ID in both structured logs.
- Invalid fault input returned HTTP 400.
- 900 ms payment delay produced a real delayed successful checkout.
- 2,200 ms payment work exceeded the 1,500 ms caller wait and returned HTTP 504.
- Every-third-request failures produced a real sustained firing Prometheus alert.
- The recovery checkpoint sent 1,608 successful real requests with zero failures, measured an error ratio below 1%, and confirmed the failure alert resolved.
- Prometheus accepted a configuration reload.
- A firing-alert checkpoint correctly failed against the recovered healthy service and recorded failed evidence rather than leaving a new pass.

The archive was extracted into a fresh directory. Every bundled file matched source; its own CLI passed prerequisite and baseline checks against the running stack. Baseline includes readiness, real scraped metrics, the Grafana data source, cross-service traces and log correlation. Log inspection is bounded to avoid an ever-growing Docker log stream exhausting the verifier buffer; application log files rotate. Baseline dashboard verification allows learner-added panels while requiring the original panel IDs.

## Website validation

Production build, ESLint and TypeScript checks passed. All 51 Playwright tests passed, including the restored homepage, eight lesson routes, mobile syllabus, clipboard copying, hints, next-lesson navigation and the actual ZIP download. Existing browser exercise recovery/replay tests remain passing. Forty-two route/viewport combinations were checked for document overflow, including course pages at 375, 390, 768, 1024, 1440 and 1920px. Automated axe checks reported no violations in ten course/catalog desktop/mobile views. Screenshots and machine-readable execution reports are in `docs/review/`.

The source kit can be regenerated with `npm run package:observability`. The real-stack regression can be repeated with `COMPOSE_PROJECT_NAME=<owned-project> node scripts/verify-observability-stack.mjs` after starting the kit. That regression deliberately injects faults in the selected course environment and restores the healthy configuration afterward.

## Honest assessment boundaries

The page does not claim to connect to or grade the learner's local Docker environment. CLI checkpoints inspect actual output and exit nonzero when evidence is absent. Passing and failed reports remain local to the downloaded kit. Arbitrary PromQL expressions, learner-added Grafana panels and written diagnoses require learner/human review. The course uses real structured stdout logs, not an unimplemented centralized log-search service. Prometheus evaluates alert states but no external notification is delivered. The short scrape/rate/alert windows are training settings, not a recommended production alert policy.
