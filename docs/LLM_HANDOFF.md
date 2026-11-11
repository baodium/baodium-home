# Baodium Labs — continuation handoff

Updated: 10 November 2026. Read this document before making further changes.

## User intent and working constraints

The user wants a professional, pedagogically strong technical learning product at **labs.baodium.com**. SRE is the first track; cybersecurity, platform engineering and other disciplines should follow. They want real environment startup, actionable exercises, and a structured coding practice experience comparable in usability to a coding interview roadmap. They explicitly asked to reuse their interview-prep code where useful, push the latest work to main, and provide this handoff.

**Preserve the restored portrait homepage at baodium.com.** The user disliked a prior homepage redesign and explicitly redirected effort to the labs. They requested SRE Labs alongside Book and Projects in the homepage navigation; this is implemented on desktop and mobile. Keep the book policy: chapters 1–7 are free, chapter 8 onward belongs to the full Amazon edition.

Repository: `https://github.com/baodium/baodium-home` (public).
Local directory: `/Users/adewaleobadimu/Documents/personal/baodium-home`.
Working branch: `main`. The user authorized pushing main and requested continued implementation, not just recommendations. Do not force-push or overwrite unrelated user work.
Next.js version: **16.4.1**. Read relevant installed documentation in `node_modules/next/dist/docs/` before editing framework behavior. Preserve the generated AGENTS.md Next.js block. No agents were delegated in this work.

## What is implemented

### Dedicated labs hub and routing

- `/labs` is the new Baodium Labs landing page, with a distinct teal/slate visual system, learning paths, available SRE content, and links to the existing book experiments and quick drills.
- Host-aware `next.config.ts` rewrites `https://labs.baodium.com/` to `/labs`. The ordinary `/` on the main domain retains the portrait homepage.
- Production requests to `/sre-labs/:path*` on `baodium.com` and `www.baodium.com` redirect permanently to the same path on `labs.baodium.com`. Localhost/preview paths remain directly testable.
- SRE metadata resolves against the labs domain. The hub canonical is `https://labs.baodium.com/`.
- Cybersecurity and platform engineering are **clearly marked planned**, with no fake working launch buttons. These curricula have not been implemented.
- Existing SRE catalog includes the coding roadmap and all learning paths; the SRE workspace navigation includes coding practice.

### SRE coding practice

- `/sre-labs/coding` is a searchable/filterable roadmap with local completion tracking and a continue-practice action. Categories: Fleet health, Signals, Automation, Reliability algorithms, Safe delivery.
- `/sre-labs/coding/[problem]` provides a two-column problem/editor workspace (stacked on mobile), acceptance criteria, fixed examples, progressive hints, reference explanations/solutions, complexity discussion and production follow-up questions.
- **24 Python exercises, 116 fixed checks.** This is a useful initial curriculum, not every possible SRE coding task.
- Six exercises adapt the user's Interview Coach: unhealthy-instance classification and deployment auditing, each in implementation, completion and debugging variants.
- Eighteen additional tasks: HTTP status counts, service error ranking, nearest-rank latency percentiles, rolling-window failures, error budgets, heartbeat gaps, retry backoff, token buckets, circuit-opening failure streaks, maintenance-window merging, dependency ordering, peak concurrency, configuration drift, event deduplication, modulo shard routing, rollout batches, disk pressure and recursive secret redaction.
- CodeMirror Python editor reuses the already-installed editor stack. An explicit plain-text editor is available. Drafts save locally, can be downloaded as `.py`, and resetting requires an inline confirmation.
- Real Python execution uses **Pyodide 314.0.7** in a disposable module Worker. It loads from the pinned jsDelivr distribution. No learner code executes in Vercel server processes and no Python backend credentials are needed.
- A 45-second runtime-load timeout, 3-second execution timeout and Stop button terminate the Worker. Every run gets a fresh runtime. Output is limited to 4,000 characters. Runtime CDN failure produces a visible retryable error.
- The harness deep-copies fixture arguments and checks input preservation, adapted from Interview Coach's test semantics. It reports actual results, expected/received differences and Python errors.
- Run examples does **not** complete an exercise. Run all checks with all checks passing records completion. Edits after a run display a stale-result notice. Prior completion is retained as practice history even after resetting a draft.
- Practice checks and reference solutions are client-inspectable; this is explicitly **not a secure exam or anti-cheat grading service**. A Web Worker is not a general hardened server sandbox. Do not reuse this design for running hostile code on an application server.
- Drafts/progress use browser-local storage with an in-memory fallback. They do not sync between devices or origins. Existing main-domain simulation progress is not automatically migrated to the labs origin.

### Real SRE observability workspace

- Eight lessons: setup, metrics, PromQL, dashboards, traces, logs, alerts and incident response at `/sre-labs/observability` and child lesson routes.
- All lessons now include prediction before experimentation, expected observations, a meaningful evidence checkpoint, misconception checks, evidence/reasoning/transfer debrief rubrics and scoped cleanup.
- `labs/observability` is an actual five-service Docker Compose environment: Express checkout → FastAPI payment, Prometheus, Grafana and Jaeger, with OpenTelemetry traces and correlated JSON logs.
- Local ports bind to loopback: checkout 4319, Prometheus 9097, Grafana 3007, Jaeger 16697. Payment and OTLP are internal. Port overrides are BAODIUM_API_PORT, BAODIUM_PROMETHEUS_PORT, BAODIUM_GRAFANA_PORT and BAODIUM_JAEGER_PORT.
- `node lab.mjs launch` checks Node/Docker prerequisites, builds/starts containers, waits for health, generates real requests and verifies scraped metrics, Grafana's datasource and cross-service traces/logs. It clears stale startup reports, records baseline/session evidence and prints tool addresses. It preserves existing injected faults, printing current settings.
- `status` checks actual HTTP readiness without generating requests; it exits nonzero when the stack is unavailable. Failed launch prints bounded diagnostics and preserves containers for investigation.
- CLI supports traffic, errors/slow/timeout faults, recover, query, logs, reload, evidence verification and scoped down.
- Slow fault is 900 ms; timeout fault is 2,200 ms versus the caller's 1,500 ms wait. Error fault fails every third payment. Recovery checks 40 seconds of real healthy requests, a measured error ratio below 1%, and alert resolution.
- `.devcontainer/devcontainer.json` and lockfile configure Node 22 + Docker-in-Docker, labeled forwarded ports, a four-core/eight-GB workspace request and an automatic post-start launch. The course links to `https://codespaces.new/baodium/baodium-home?ref=main`.
- Vercel serves the website; a learner's Codespace or local Docker runs the lab. GitHub account/quota/billing and stop/delete responsibilities are disclosed. Keep Codespaces forwarded ports private (Grafana is a local anonymous Editor).
- The **exact devcontainer was built and started locally** using Dev Containers CLI 0.90.0. Its automatic launch successfully proved real metrics, dashboards and connected traces. **Actual GitHub Codespaces provisioning and hosted port forwarding have not been exercised in an account.** No paid workspace was created during development.
- Source-only ZIP: `public/downloads/baodium-observability-lab.zip`. Regenerate it after changing anything in `labs/observability`, then check the packaged bytes. Do not add Python to production prebuild just to create this archive.

### Existing simulations retained

Six browser simulations: instrument, SLO, alert, cascade, capacity and deployment under `/sre-labs`. They remain distinct from the real Docker course. Book labs at `/system-design/experience` and quick drills at `/play` are linked from the hub.

## Important files

- `next.config.ts`: labs-host root rewrite, main-host SRE redirects, Python Worker CSP.
- `src/app/labs/page.tsx`: labs hub.
- `src/components/labs/LabsShell.tsx`, `labs.css`: dedicated lab design system and responsive shell.
- `src/components/labs/CodingRoadmap.tsx`: search/filter/progress path.
- `src/components/labs/CodingWorkspace.tsx`, `PythonEditor.tsx`: editor, draft lifecycle, run states and feedback.
- `src/lib/labs/coding-problems.json`: all authored contracts, starters, reference solutions and fixtures.
- `src/lib/labs/coding.ts`: catalog types and ordered summaries.
- `src/lib/labs/coding-progress.ts`: validated optional browser persistence.
- `src/lib/labs/python-runner.ts`: Worker lifecycle, limits, cancellation and result validation.
- `public/workers/sre-python.mjs`: pinned Pyodide import and Python harness.
- `scripts/verify-sre-coding.py`: validates every reference solution, input preservation and nontrivial starters.
- `e2e/labs-coding.spec.ts`: host routing, filtering, real browser Python, completion rules, draft persistence/reset, errors, cancellation, infinite loops, mobile and blocked storage.
- `labs/observability/`: real applications, Compose, tool configs and CLI.
- `src/lib/sre/observability-course.ts`, `course-teaching.ts`: operational course and pedagogical scaffolding.
- `scripts/verify-observability-stack.mjs`: real fault/alert/recovery integration check.
- `scripts/package-observability.py`: deterministic source-only ZIP packaging.
- `docs/lab-workspace-improvements.md`, `docs/observability-course.md`: prior detailed implementation reports.
- `docs/review/`: screenshots and machine-readable review evidence; distinguish older superseded homepage redesign reports from the preserved portrait homepage.

## Provenance of reused code

The user explicitly requested reuse from their interview-prep project. Source inspected at `baodium/interview-coach` (private), cloned temporarily to `/tmp/baodium-interview-source`. Only authored synthetic problem contracts, starter variants, fixtures and the argument-preservation test pattern were adapted. No authentication, credentials, private user records or production service tokens were copied. The old regex-filtered subprocess executor was **not** exposed through the new public Vercel site. Original editor used Monaco; this repository already had CodeMirror, which was reused to avoid a second editor dependency.

## Verification and deployment workflow

Run:

```sh
npm run lint
npm run typecheck
npm run build
npm run verify:sre-coding
npm run verify:observability-package
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3102 npx playwright test --workers=2
```

Start an owned production preview with `npm run start -- -p 3102` before the browser suite. The user's separate existing dev server was at port 3481; do not kill unrelated servers. Concurrent dev/build type generation can temporarily race in `.next/dev/types`; rerun typechecking after build finishes rather than changing application types to mask missing generated files.

For the real stack, use a distinct project:

```sh
COMPOSE_PROJECT_NAME=baodium-observability-qa node labs/observability/lab.mjs launch
COMPOSE_PROJECT_NAME=baodium-observability-qa npm run verify:observability-stack
COMPOSE_PROJECT_NAME=baodium-observability-qa node labs/observability/lab.mjs down
```

On this machine Docker CLI is `/Users/adewaleobadimu/.docker/bin/docker`; add that directory to PATH if needed. Never stop/remove all containers or prune unrelated Docker resources. Owned local integration containers, the nested devcontainer and its Docker volume were cleaned up after verification.

Prior validated results: real local fault-to-recovery integration; exact local devcontainer automatic startup; invalid-port startup failure clears stale evidence; stopped status exits nonzero; 24 Python reference solutions pass all 116 fixed fixtures; all 51 pre-coding browser tests; zero Axe violations on the operational course at two widths and on the new hub/roadmap/workspace at 390/1440. The final local release validation passed **all 56 Playwright tests**, and all **24 reference solutions / 116 checks also passed in actual browser Pyodide Workers**. See `docs/review/labs-release-validation.json` and `coding-runtime-validation.json`.

Vercel account/scope: `baodiumgmailcoms-projects`. Existing project: `baodium-home`, ID `prj_JbIw6c0WPjt1Xorn6EpFGSel3lwy`, Node 24, Next.js preset, root directory `.`. `labs.baodium.com`, `lab.baodium.com`, `baodium.com` and `www.baodium.com` were already aliases on this same project. No DNS migration is necessary for labs.baodium.com. Domain authority is already Vercel. Do not reassign unrelated domains or use --force. The singular `lab.baodium.com` is not given a dedicated root rewrite by this milestone; only the user-requested plural domain is.

## What remains / recommended next work

1. **Hosted validation:** create a Codespace in an appropriate account, verify startup and private forwarded Grafana/Prometheus/Jaeger URLs, run an actual lesson and stop/delete it. Local devcontainer proof does not substitute for provider-side validation.
2. **Curriculum depth:** add broader SRE tasks: Bash/SQL/Go, filesystem and networking diagnostics, Kubernetes manifests, Terraform policy checks, CI/CD configuration, SLO burn-rate analysis, process management, testing and debugging longer programs. Each needs explicit contracts, meaningful fixed cases, failure/edge cases, explanations and operational follow-ups. Current 24 exercises are not exhaustive.
3. **Practice modes:** add custom user test inputs, submission history, review scheduling, prerequisite recommendations and richer editor workflows. Do not label publicly shipped browser checks as secret/hidden tests.
4. **Progress and accounts:** decide whether to add accounts and synchronized progress. Currently local only; preserve optional storage behavior and plan main-domain-to-labs-domain migration explicitly.
5. **Cybersecurity track:** design a separate, controlled defensive curriculum and isolated environment lifecycle before publishing it as available. Current card is planning only. Platform engineering is similarly unimplemented.
6. **Environment orchestration:** for truly managed one-click labs without a GitHub account, provision a dedicated execution service with isolation, quotas, teardown, lifecycle monitoring and cost controls. Vercel alone should not run long-lived learner Docker stacks.
7. **Assessment depth:** arbitrary PromQL and learner-created Grafana panels still require manual interpretation. Existing checks prove infrastructure/data availability and real incidents, not full semantic correctness of arbitrary learner queries or explanations.
8. **Further quality work:** test Firefox/Safari and lower-memory devices, consider self-hosting the pinned Python runtime if CDN dependency is undesirable, add durable curriculum versioning/progress migrations, improve SEO/sitemaps for multiple learning domains, and centralize displayed curriculum counts before expanding the catalog.
9. **UI refinement:** keep the lab design cohesive across the new hub, coding pages and older simulation workspaces. Do not restart a homepage redesign. Confirm keyboard workflows and short-screen/mobile layouts after changes.

## Suggested next-agent prompt

Continue the Baodium Labs implementation in the existing repository. Read AGENTS.md, this handoff and the latest release validation first. Preserve the portrait homepage and seven-free-chapter policy. Inspect git status and the latest main commit before editing. Verify current deployment before claiming something is live. Prioritize actual Codespaces provider validation, then deepen the SRE coding curriculum and create a deliberate cybersecurity curriculum. Keep production execution isolated, progress truthful and learner-facing instructions actionable. The user authorizes implementation and pushing main; provide concise progress updates and a final tested/not-tested distinction.
