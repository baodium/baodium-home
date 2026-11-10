export type CourseStep = {
  title: string;
  instruction: string;
  command?: string;
  expect: string;
};
export type CourseLesson = {
  slug: string;
  title: string;
  minutes: number;
  tool: string;
  outcome: string;
  steps: CourseStep[];
  checkpoint: string;
  checkpointMeaning: string;
  hint: string;
  challenge: string;
  reference: string;
  referenceTitle: string;
};
export const OBSERVABILITY_COURSE: CourseLesson[] = [
  {
    slug: "setup",
    title: "Run an observable checkout",
    minutes: 12,
    tool: "Docker Compose",
    outcome:
      "Start two real services and the tools that observe them. Prove that all four local interfaces respond.",
    steps: [
      {
        title: "Prepare the workspace",
        instruction:
          "Install Docker with Compose and Node.js 20 or newer. Download and extract the lab kit, then open a terminal in the extracted baodium-observability directory.",
        command: "node lab.mjs doctor",
        expect:
          "The Docker server version and a successful Compose configuration check. If the daemon is unavailable, start Docker before continuing.",
      },
      {
        title: "Start your stack",
        instruction:
          "Build the Express checkout and FastAPI payment service. Start Prometheus, Grafana and Jaeger alongside them. The first run downloads pinned images and dependencies.",
        command: "node lab.mjs up",
        expect:
          "Five services start under the baodium-observability Compose project. Only loopback interfaces are published.",
      },
      {
        title: "Find your tools",
        instruction:
          "Open checkout at localhost:4319/health, Prometheus at localhost:9097, Grafana at localhost:3007 and Jaeger at localhost:16697. The two applications communicate over the Compose network.",
        expect:
          "The checkout health response, a Prometheus UI, the Baodium dashboard folder and the Jaeger search UI.",
      },
    ],
    checkpoint: "node lab.mjs verify setup",
    checkpointMeaning:
      "Checks HTTP readiness of checkout, Prometheus, Grafana and Jaeger. Writes reports/setup.json only when they respond.",
    hint: "Run docker compose ps and docker compose logs --tail 30. If a published port is occupied, stop only this project or change the BAODIUM_*_PORT environment variables in your terminal.",
    challenge:
      "Explain why payment has no published host port even though checkout can call it.",
    reference: "https://docs.docker.com/compose/gettingstarted/",
    referenceTitle: "Docker Compose getting started",
  },
  {
    slug: "metrics",
    title: "Instrument requests, work and latency",
    minutes: 15,
    tool: "Prometheus metrics",
    outcome:
      "Distinguish a counter, an in-flight gauge and a latency histogram using actual checkout requests.",
    steps: [
      {
        title: "Generate real requests",
        instruction:
          "Send bounded concurrent traffic through checkout and payment. The CLI reports successful and failed HTTP responses and the final trace ID.",
        command: "node lab.mjs traffic 15",
        expect:
          "Successful requests in the default healthy configuration. Every finished request increments the checkout counter.",
      },
      {
        title: "Inspect the exposition endpoint",
        instruction:
          "Open localhost:4319/metrics. Find baodium_checkout_requests_total, baodium_checkout_active_requests and baodium_checkout_duration_seconds_bucket. Repeat traffic while watching the gauge.",
        expect:
          "The counter is cumulative, the gauge can return to zero, and histogram buckets count observed durations in seconds.",
      },
      {
        title: "Read the instrumentation",
        instruction:
          "Open checkout/app.mjs in the downloaded kit. Locate requests.inc, active.inc/dec and latency.startTimer. HTTP status is a bounded metric label; trace IDs appear in logs rather than metric labels.",
        expect:
          "All three measurements surround the same real outbound payment request, including error and timeout paths.",
      },
    ],
    checkpoint: "node lab.mjs verify metrics",
    checkpointMeaning:
      "Generates requests and checks that Prometheus has scraped a positive completed-request counter. The metric-type explanation is your own interpretation, not an automatic score.",
    hint: "Prometheus scrapes every two seconds. No samples yet is different from zero requests. A request counter is not the number currently in flight.",
    challenge:
      "Explain why a trace ID should not become a label on the request counter.",
    reference: "https://prometheus.io/docs/concepts/metric_types/",
    referenceTitle: "Prometheus metric types",
  },
  {
    slug: "promql",
    title: "Ask a precise operational question",
    minutes: 18,
    tool: "PromQL",
    outcome:
      "Calculate request rate, error ratio and tail latency from the same measured population.",
    steps: [
      {
        title: "Compare totals and rates",
        instruction:
          "Generate traffic in a second terminal while querying. A total counter and a per-second rate answer different questions.",
        command:
          'node lab.mjs query "sum(rate(baodium_checkout_requests_total[30s]))"',
        expect:
          "A requests-per-second value after at least two scrapes. It changes with the traffic instead of increasing forever.",
      },
      {
        title: "Inject a controlled failure",
        instruction:
          "Make every third payment fail and add 100 ms of work, then generate 30 seconds of traffic. Checkout returns a failed response for failed payment calls.",
        command: "node lab.mjs fault errors\nnode lab.mjs traffic 30",
        expect:
          "A mix of successful and failed real HTTP responses. This changes telemetry, not a chart fixture.",
      },
      {
        title: "Measure impact",
        instruction:
          "Divide failed request rate by total request rate. Both sides use the same 30-second range and completed checkout population.",
        command:
          "node lab.mjs query 'sum(rate(baodium_checkout_requests_total{status=~\"5..\"}[30s])) / sum(rate(baodium_checkout_requests_total[30s]))'",
        expect:
          "A nonzero ratio that approaches one third under steady fault traffic. Short windows and scrape timing affect the exact value.",
      },
    ],
    checkpoint: "node lab.mjs verify metrics",
    checkpointMeaning:
      "Checks the data source. Compare your query output with the injected failure policy; the verifier does not grade arbitrary PromQL expressions.",
    hint: "An empty vector often means the metric has not been scraped. Do not add two differently filtered denominators or confuse a fraction such as 0.33 with 0.33%.",
    challenge:
      "Build histogram_quantile(0.95, sum by (le) (rate(baodium_checkout_duration_seconds_bucket[30s]))) and explain its unit and approximation.",
    reference: "https://prometheus.io/docs/prometheus/latest/querying/basics/",
    referenceTitle: "PromQL basics",
  },
  {
    slug: "dashboards",
    title: "Build a dashboard around decisions",
    minutes: 15,
    tool: "Grafana",
    outcome:
      "Read a provisioned dashboard, inspect its queries, and add a panel that answers a new operational question.",
    steps: [
      {
        title: "Open the baseline dashboard",
        instruction:
          "Open localhost:3007/d/baodium-checkout. Its data sources and four panels are provisioned from files in the kit.",
        expect:
          "Request rate, error ratio, p95 latency in seconds, and active checkouts. Empty panels need traffic; they are not proof of health.",
      },
      {
        title: "Create evidence worth reading",
        instruction:
          "Recover the payment service, generate traffic, then compare a healthy window with the preceding injected failure. Adjust the time range if you see a mixture of both.",
        command: "node lab.mjs recover\nnode lab.mjs traffic 15",
        expect:
          "New requests succeed. The rolling rate panels take time to replace older failure samples.",
      },
      {
        title: "Add your own panel",
        instruction:
          "Edit the dashboard in the local Grafana UI. Duplicate the latency panel and change its quantile from 0.95 to 0.99. Give it an explicit title and seconds unit. Save your working copy.",
        expect:
          "A p99 panel backed by the same histogram, not a copied number. The verifier checks the provisioned baseline; visually inspect your added panel.",
      },
    ],
    checkpoint: "node lab.mjs verify dashboards",
    checkpointMeaning:
      "Confirms that Grafana serves the four-panel provisioned baseline. Your additional panel remains a manual learning task.",
    hint: "The histogram is in seconds. Setting a milliseconds display unit without converting the query changes the meaning of the number.",
    challenge:
      "Explain which panel would distinguish increased traffic from a slower dependency.",
    reference:
      "https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/",
    referenceTitle: "Build Grafana dashboards",
  },
  {
    slug: "traces",
    title: "Follow a checkout across two frameworks",
    minutes: 18,
    tool: "OpenTelemetry + Jaeger",
    outcome:
      "Find a slow FastAPI operation inside an Express checkout trace and prove that context crossed the network.",
    steps: [
      {
        title: "Slow the dependency",
        instruction:
          "Make payment take 900 ms without injecting failures. Checkout still waits up to 1,500 ms for the dependency.",
        command: "node lab.mjs fault slow\nnode lab.mjs traffic 12",
        expect:
          "Successful but visibly slower responses. The CLI prints a real trace ID from checkout.",
      },
      {
        title: "Inspect the waterfall",
        instruction:
          "Open localhost:16697 and search the baodium-checkout service. Open a trace with POST /checkout, payment.request and POST /charge spans.",
        expect:
          "One trace contains both baodium-checkout and baodium-payment services. The outbound payment call contains most of the elapsed time.",
      },
      {
        title: "Inspect propagation",
        instruction:
          "Read checkout/app.mjs and payment/app.py. The client injects W3C trace context and the Python service extracts it before creating its server span.",
        expect:
          "The payment server span has a parent reference and shares the root trace ID. Both services export OTLP/HTTP to Jaeger.",
      },
    ],
    checkpoint: "node lab.mjs verify traces",
    checkpointMeaning:
      "Queries Jaeger for a cross-service trace with the outbound span and a referenced payment span, then checks that the same trace ID appears in both services’ structured logs.",
    hint: "Export and collection are asynchronous. The verifier polls for up to 25 seconds. Check Jaeger and application logs if an exporter cannot connect.",
    challenge:
      "Inject the timeout fault and explain why a payment span can finish after the checkout client span has ended.",
    reference: "https://opentelemetry.io/docs/concepts/context-propagation/",
    referenceTitle: "OpenTelemetry context propagation",
  },
  {
    slug: "logs",
    title: "Use logs as evidence for a trace",
    minutes: 12,
    tool: "Structured JSON logs",
    outcome:
      "Correlate an individual customer outcome with work performed by the downstream service.",
    steps: [
      {
        title: "Produce a mixed outcome",
        instruction:
          "Inject payment errors and generate traffic. Keep the trace ID printed by the traffic command.",
        command: "node lab.mjs fault errors\nnode lab.mjs traffic 10",
        expect:
          "Checkout records HTTP 502 when the payment service returns its injected HTTP 500.",
      },
      {
        title: "Read both sides",
        instruction:
          "Read the bounded recent logs. Find checkout.finished and charge.finished records, including service, status, trace_id and span_id.",
        command: "node lab.mjs logs",
        expect:
          "The two services share a trace ID for the same request and use different span IDs. Status codes describe each service’s own response.",
      },
      {
        title: "Correlate, do not guess",
        instruction:
          "Open a failed trace in Jaeger and find the matching records in the log output. Explain what evidence identifies the origin of the failure.",
        expect:
          "A failure in payment and the resulting checkout outcome can be connected by an actual trace ID.",
      },
    ],
    checkpoint: "node lab.mjs verify traces",
    checkpointMeaning:
      "Checks cross-service tracing and shared trace IDs in real container logs. This kit uses stdout JSON; it does not pretend to include a centralized log-search backend.",
    hint: "Not every line is an application event: startup and exporter diagnostics may be plain text. The verifier parses JSON event records and ignores other lines.",
    challenge:
      "Explain why searching only for the string 500 would miss checkout’s 502 response and lose the relationship between the two events.",
    reference: "https://opentelemetry.io/docs/concepts/signals/logs/",
    referenceTitle: "OpenTelemetry logs and correlation",
  },
  {
    slug: "alerts",
    title: "Make an alert earn its page",
    minutes: 20,
    tool: "Prometheus alert rules",
    outcome:
      "Trigger a real sustained-condition alert, inspect pending/firing states, and change its rule safely.",
    steps: [
      {
        title: "Read the rule before testing",
        instruction:
          "Open prometheus/alerts.yml. CheckoutFailuresHigh requires an error ratio above 10%, more than one request per second, and a five-second sustained condition. Windows are shortened for this local exercise.",
        expect:
          "The rule describes a measured customer symptom and a low-traffic guard. A separate rule handles an unavailable scrape target.",
      },
      {
        title: "Keep the fault present",
        instruction:
          "Inject errors and generate traffic long enough for scrapes, the 30-second rate calculation and the sustained condition.",
        command: "node lab.mjs fault errors\nnode lab.mjs traffic 30",
        expect:
          "Prometheus at localhost:9097/alerts progresses through pending to firing for CheckoutFailuresHigh.",
      },
      {
        title: "Test a rule change",
        instruction:
          "Change for: 5s to for: 15s in alerts.yml, reload, and compare how long the condition must persist. Restore five seconds before the checkpoint if you want the shorter exercise.",
        command: "node lab.mjs reload",
        expect:
          "A valid rule reload succeeds. Invalid configuration is rejected; its error appears in the Prometheus logs.",
      },
    ],
    checkpoint: "node lab.mjs verify alerts",
    checkpointMeaning:
      "Reads Prometheus’s evaluated alert API and passes only when CheckoutFailuresHigh is actually firing. It does not send an external notification.",
    hint: "Do not infer firing from the YAML alone. The expression, scrape history, request-rate guard and for duration must all be satisfied.",
    challenge:
      "Stop only checkout with docker compose stop checkout and distinguish a missing target from a healthy zero-error service. Start it again before recovery.",
    reference:
      "https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/",
    referenceTitle: "Prometheus alerting rules",
  },
  {
    slug: "incident",
    title: "Investigate, recover and prove it",
    minutes: 20,
    tool: "Incident response",
    outcome:
      "Use metrics, spans and logs to find a timed-out dependency, recover it, and verify a healthy rolling window.",
    steps: [
      {
        title: "Create an incident",
        instruction:
          "Make payment take 2,200 ms while checkout waits only 1,500 ms. Generate requests and examine the result before changing anything.",
        command: "node lab.mjs fault timeout\nnode lab.mjs traffic 15",
        expect:
          "Checkout returns HTTP 504. Traces and logs show which operation exceeded the caller’s wait; payment work may continue after that wait ends.",
      },
      {
        title: "Write a diagnosis",
        instruction:
          "Record the symptom, the slow service, one trace ID, the relevant metric query, and the mitigation you intend to test. Keep customer impact separate from the root cause.",
        expect:
          "An explanation backed by a metric, a cross-service trace and a correlated log record, rather than a guess based on one graph.",
      },
      {
        title: "Recover and validate",
        instruction:
          "Restore payment to 40 ms with no injected failures. The recovery verifier generates 40 seconds of healthy traffic so the 30-second alert window can genuinely recover.",
        command: "node lab.mjs recover\nnode lab.mjs verify recovery",
        expect:
          "No new failed requests, measured error ratio below 1%, and the failure alert resolved. The passing report is written to reports/recovery.json.",
      },
    ],
    checkpoint: "node lab.mjs verify recovery",
    checkpointMeaning:
      "Generates fresh traffic, checks actual response outcomes and Prometheus error ratio, and confirms the firing failure alert resolved. Repeating it runs another 40-second check.",
    hint: "A successful configuration change does not erase past failures. Allow the evaluation window to move and inspect new samples before declaring recovery.",
    challenge:
      "Explain what you would monitor during the next rollout, and why simply increasing every timeout could increase in-flight work.",
    reference: "https://sre.google/sre-book/monitoring-distributed-systems/",
    referenceTitle: "Monitoring distributed systems",
  },
];
