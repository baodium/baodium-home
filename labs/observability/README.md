# Baodium — Build an observable checkout

A real local observability environment, not a browser simulation. Express checkout calls a FastAPI payment service. Prometheus scrapes request metrics, Grafana queries Prometheus, and both applications export OpenTelemetry spans to Jaeger. The same trace IDs appear in JSON logs.

## Browser workspace (recommended for the hosted course)

Open https://codespaces.new/baodium/baodium-home?ref=main and create a Codespace. The repository devcontainer includes Node and Docker-in-Docker; its post-start task runs the same verified launcher below. Wait for “Workspace ready”, then work in labs/observability. Open services through the labeled Ports tab, keeping visibility private. The CLI prints forwarded HTTPS tool URLs when running in Codespaces. The website’s localhost links apply only to local Docker.

GitHub sign-in and Codespaces quota/billing are required. Run `node lab.mjs down` when finished, then stop/delete the Codespace through GitHub; removing lab containers alone does not stop workspace billing. Vercel serves the learning pages; it does not host these containers. The Docker stack is integration-tested locally; provisioning on an actual Codespaces account still requires provider-side validation.

## Prerequisites and start

- Docker with the Compose plugin and a running daemon.
- Node.js 20 or newer for the dependency-free host CLI. The checkout container uses Node.js 22 for its OpenTelemetry SDK.
- Free loopback ports 4319, 9097, 3007 and 16697.

Open a terminal in this extracted directory:

```sh
node lab.mjs launch
node lab.mjs status
```

The guided launcher checks prerequisites, builds the stack, waits for readiness and generates real traffic to verify metrics, dashboard connectivity and trace propagation. It writes reports/baseline.json and reports/session.json only after those checks pass. Rerunning preserves existing fault settings and prints them; use recover when you want a healthy configuration. If startup fails, bounded container diagnostics are printed and containers remain available for inspection. status checks live HTTP readiness without generating traffic.

The first run downloads images and builds the two apps. Source code, dependency pins, tool configuration and verification commands are included. No host npm/pip installation is needed. Follow the eight exercises at https://baodium.com/sre-labs/observability.

| Tool | URL |
|---|---|
| Checkout health | http://localhost:4319/health |
| Raw checkout metrics | http://localhost:4319/metrics |
| Prometheus queries and alerts | http://localhost:9097 |
| Grafana dashboard | http://localhost:3007/d/baodium-checkout |
| Jaeger traces | http://localhost:16697 |

All published ports bind to 127.0.0.1. Grafana is a local anonymous Editor environment so you can build panels. These settings are for this isolated exercise; do not publish this Compose configuration to the internet. Payment and OTLP ingestion are internal to the Compose network.

## Exercise path

1. **Setup:** start the five containers and verify their interfaces.
2. **Metrics:** inspect counters, active work and latency histograms in checkout/app.mjs and /metrics.
3. **PromQL:** compare a total, a request rate and an error ratio after injecting failures.
4. **Grafana:** inspect the baseline dashboard, then create a p99 panel with an explicit seconds unit.
5. **Tracing:** inject slow payment work, locate it in Jaeger, and inspect W3C context propagation across Express and FastAPI.
6. **Logs:** connect checkout.finished and charge.finished by trace_id, with separate span IDs and service-specific HTTP outcomes.
7. **Alerts:** generate a sustained failure, inspect pending/firing, edit prometheus/alerts.yml and reload it.
8. **Incident:** inject a timeout, diagnose it with all three signals, restore payment, and prove measured recovery.

Every exercise on the site has task instructions, expected observations, a hint, a checkpoint, a reflection question and scoped cleanup. The command-line checkpoints inspect real output; reading a lesson is not treated as executing it.

## Faults, traffic and recovery

```sh
node lab.mjs fault errors
node lab.mjs traffic 30
node lab.mjs verify alerts
node lab.mjs fault slow
node lab.mjs traffic 12
node lab.mjs verify traces
node lab.mjs fault timeout
node lab.mjs traffic 15
node lab.mjs recover
node lab.mjs verify recovery
```

- `errors`: payment takes 100 ms and every third request returns HTTP 500; checkout maps that to HTTP 502.
- `slow`: payment takes 900 ms, below checkout's 1,500 ms outbound timeout.
- `timeout`: payment takes 2,200 ms, causing checkout to return HTTP 504. Downstream work may finish after checkout stops waiting.
- `recover`: restores 40 ms payment work with no injected failures. Existing counters and traces remain available.
- `traffic N`: four concurrent clients for 1–120 seconds; prints actual response counts and a trace ID.

The recovery verifier generates 40 seconds of actual healthy traffic to replace the 30-second alert evaluation window. It requires no newly failed requests, an observed error ratio below 1%, and resolution of the firing checkout failure alert.

## Checkpoints and their limits

```sh
node lab.mjs verify setup
node lab.mjs verify metrics
node lab.mjs verify dashboards
node lab.mjs verify traces
node lab.mjs verify alerts
node lab.mjs verify recovery
node lab.mjs verify baseline
```

`baseline` checks readiness, scraped metrics, the provisioned dashboard, cross-service traces and log correlation. It does not create a fault or claim recovery. `alerts` requires a firing real Prometheus alert. `recovery` requires the healthy configuration and measures its output. A passing checkpoint writes reports/<checkpoint>.json and exits zero; a missing condition exits nonzero with a recovery suggestion.

The dashboard verifier checks the four provisioned baseline panels. Your additional panels and written diagnosis need visual/human review. The kit does not automatically grade arbitrary PromQL, send external notifications or run a centralized log-search backend.

## Queries

```sh
node lab.mjs query "sum(rate(baodium_checkout_requests_total[30s]))"
node lab.mjs query 'sum(rate(baodium_checkout_requests_total{status=~"5.."}[30s])) / sum(rate(baodium_checkout_requests_total[30s]))'
node lab.mjs query "histogram_quantile(0.95, sum by (le) (rate(baodium_checkout_duration_seconds_bucket[30s])))"
```

Histogram buckets and the quantile result use seconds. Status is a bounded metric label. Trace IDs belong in logs/spans, not metric labels. No data is not a healthy zero. Prometheus scrapes/evaluates every two seconds; this short training configuration is not a production alert policy.

## Configuration and logs

```sh
node lab.mjs logs
node lab.mjs reload
```

`reload` asks Prometheus to validate and reload the local rules. A rejected configuration fails the command. Inspect `docker compose logs --tail 30 prometheus` for the reason. The alert evaluates a >10% 30-second error ratio, traffic >1 request/s and a five-second `for` condition. A separate alert handles an unavailable checkout scrape target.

To use different host ports, set BAODIUM_API_PORT, BAODIUM_PROMETHEUS_PORT, BAODIUM_GRAFANA_PORT and BAODIUM_JAEGER_PORT in your terminal before both Compose and CLI commands. To isolate multiple instances, set COMPOSE_PROJECT_NAME and use distinct host ports. These are ordinary environment variables; the kit does not source or execute a downloaded shell script.

## Cleanup

```sh
node lab.mjs down
```

This removes only this Compose project's services, network and volumes. It never removes every container on your machine. Local JSON reports remain in the reports folder. Jaeger stores at most 5,000 traces in memory and Prometheus retention is two hours. All environment telemetry is disposable.
