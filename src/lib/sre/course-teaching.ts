/** Predictions precede observation; rubrics distinguish evidence from interpretation. */
export const COURSE_TEACHING: Record<string, { prediction: string; misconception: string; evidence: string; explanation: string; transfer: string }> = {
  setup: {
    prediction: "Which connections need a published host port, and which can use Docker’s internal network? Sketch checkout → payment and both telemetry paths before starting.",
    misconception: "A running container is not proof that its dependencies or telemetry work. The launcher checks real requests and exported signals after startup.",
    evidence: "Keep reports/baseline.json and reports/session.json. Identify the successful cross-service trace check and the actual tool addresses.",
    explanation: "Describe the request path separately from the metrics scrape and trace export paths. Payment can stay internal because checkout shares its Compose network.",
    transfer: "If Grafana loads but its panels are empty, which connection would you investigate first, and what would falsify your hypothesis?",
  },
  metrics: {
    prediction: "After traffic stops, which signal should remain cumulative, which should return to zero, and which records the distribution of completed work?",
    misconception: "Zero active requests says nothing about past failures. A counter reset after a restart is not negative traffic.",
    evidence: "Record a counter before and after traffic, an active-request observation during load, and two histogram bucket boundaries with their counts.",
    explanation: "Connect each instrument to an operational question. Explain cumulative buckets and why trace IDs would create unbounded label cardinality.",
    transfer: "How would you distinguish a service doing no work from a service whose metrics endpoint stopped responding?",
  },
  promql: {
    prediction: "With every third payment failing, what steady-state error fraction do you expect? Predict how a 30-second window behaves immediately after recovery.",
    misconception: "A ratio of 0.33 means 33%. Missing samples and NaN are not evidence of zero errors; inspect the numerator and denominator separately.",
    evidence: "Save the exact query, timestamp, numerator, denominator and resulting ratio during sustained fault traffic.",
    explanation: "Use the same population and window on both sides. Explain deviations from one third using scrape timing and the mix of old and new samples.",
    transfer: "Would averaging per-instance error percentages preserve the correct fleet-wide error ratio when instances handle different traffic volumes?",
  },
  dashboards: {
    prediction: "Which panels should change under more traffic, and which under a slower dependency with the same number of clients?",
    misconception: "An attractive chart can still mislead. Units, query population and time range must agree before you draw a conclusion.",
    evidence: "Capture your p99 panel with its query, seconds unit and time range visible. Compare it with p95 for the same window.",
    explanation: "State the decision each panel supports. Explain why histogram quantiles are estimates and why low sample counts weaken conclusions.",
    transfer: "Design one additional panel that would help decide whether to roll back a deployment. State the decision threshold and a limitation.",
  },
  traces: {
    prediction: "With a 900 ms payment delay and a 1,500 ms caller timeout, predict the response outcome and where most of the trace duration will appear.",
    misconception: "Sharing a trace ID alone does not prove correct parentage. Inspect the payment server span’s parent against the outbound client span.",
    evidence: "Record one trace ID, both service names, the outbound span ID and the payment parent span ID, plus the observed durations.",
    explanation: "Explain how injected and extracted W3C context connects Express to FastAPI. Separate caller waiting time from downstream work.",
    transfer: "After a client timeout, what evidence would tell you whether downstream work was cancelled or continued?",
  },
  logs: {
    prediction: "If payment returns 500 and checkout maps it to 502, what values should the two services log for the same request?",
    misconception: "Equal timestamps or matching status strings do not establish request identity. Use the actual trace ID and service-specific span IDs.",
    evidence: "Preserve a pair of JSON events from different services with the same trace_id, distinct span_id values and their individual status codes.",
    explanation: "Connect the dependency failure to the customer-facing response. Distinguish observed facts from an inferred cause.",
    transfer: "What useful evidence would remain if trace export failed but both applications still wrote their structured logs?",
  },
  alerts: {
    prediction: "Can a single failed request trigger this rule? Read its rate guard, range window and for duration before generating load.",
    misconception: "A rule in YAML is not a firing alert. Evaluation must satisfy the expression continuously for its configured duration.",
    evidence: "Record the evaluated rule, observed pending/firing states and the traffic conditions. Preserve reports/alerts.json after actual firing.",
    explanation: "Explain how the traffic guard limits low-volume noise and what the separate missing-target alert detects.",
    transfer: "What additional routing, ownership and delivery evidence would you need before claiming this alert can page an on-call engineer?",
  },
  incident: {
    prediction: "Payment takes 2,200 ms but checkout waits 1,500 ms. Predict the customer response and whether payment might still complete.",
    misconception: "A successful configuration change proves the change was accepted. Recovery requires successful new requests and a recovered evaluation window.",
    evidence: "Build a short timeline: symptom, metric query and timestamp, trace ID, correlated log events, mitigation and reports/recovery.json.",
    explanation: "Use the caller deadline and downstream duration to justify the diagnosis. State what the evidence rules out and what remains uncertain.",
    transfer: "Propose a prevention experiment involving deadlines, cancellation or concurrency limits, and specify how you would measure its effect.",
  },
};
