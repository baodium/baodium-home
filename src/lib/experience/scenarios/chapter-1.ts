import type { ChapterScenario } from "@/lib/experience/scenarios/types";

export const chapter1Scenario: ChapterScenario = {
  meta: {
    id: "chapter-1",
    slug: "chapter-1",
    number: 1,
    title: "Resource Contention",
    subtitle: "Recommendations, a feature flag, and a 40-slot pool",
    bookHref: "/system-design/chapter-1",
    status: "ready",
    durationMin: 12,
  },
  brief:
    "You are adding recommendations to the product page. Code is ready; tests pass. Enable for a small group and operate the system like an on-call engineer: pool metrics, mitigations, and a kill switch that does not kill in-flight work.",
  assumptions: [
    "Simulated metrics shaped like pool.active / pool.pending / acquire.wait / acquire.timeouts (not live telemetry).",
    "Pool size fixed at 40 connections (shared across the product service).",
    "Recommendation path holds a DB connection ~70ms; baseline page ~12ms (hold time ≈ checkout→checkin, not query-only).",
    "Feature flag uses stable user hashing; deploy ≠ enable.",
    "Disabling the flag stops new recommendation work; in-flight requests finish their holds.",
    "Acquire timeout maps to connectionTimeout; load shed skips recs when util is high; cache shortens W.",
    "Latency SLO target: p99 < 200ms (simulated error-budget burn).",
  ],
  codeLines: [
    "async function getProductPage(req) {",
    "  const product = await db.products.get(req.productId);",
    "  // …render core product…",
    "  let recommendations = [];",
    "  if (flags.recommendations.enabledFor(req.userId)) {",
    "    // Extra synchronous lookup on the request path",
    "    const conn = await pool.acquire();          // ← shared pool",
    "    try {",
    "      recommendations = await conn.query(",
    "        `SELECT … FROM recommendations WHERE product_id = $1`,",
    "        [req.productId],",
    "      );",
    "    } finally {",
    "      pool.release(conn);",
    "    }",
    "  }",
    "  return render({ product, recommendations });",
    "}",
  ],
  steps: [
    {
      id: "inspect",
      title: "Inspect the feature",
      body: "Toggle the product page preview. Recommendations add one synchronous DB lookup on the same request path. Still invisible to live traffic until the flag exposes users.",
      require: "toggle_preview",
    },
    {
      id: "review",
      title: "Review the change",
      body: "The diff is small: an extra lookup behind a feature flag. Deploy at 0% first so the code is live without anyone on the new path. Shipping is not enabling.",
      require: "deploy_zero",
    },
    {
      id: "trace",
      title: "Trace one request",
      body: "Send one request. Watch the code highlight, a pool slot acquire, the DB hold, then release. Correct code still consumes a shared connection from a finite pool.",
      require: "trace_request",
    },
    {
      id: "rollout",
      title: "Begin rollout",
      body: "Raise exposure to 5%, then 25%. Stable hashing keeps the same users in or out. Each exposed request lengthens mean hold time W. Demand is λ × W. Predict before 25%, then check the measured outcome.",
      prediction: "At 25% with ~80 req/s and ~70ms holds for exposed users, will demand stay under 40 slots?",
      require: "exposure_25",
    },
    {
      id: "inspect_prod",
      title: "Inspect production",
      body: "Read Ops metrics like a dashboard: pool.active, pool.pending, acquire.wait.p99, path-split latency, and the p99 SLO burn. Busy slots never exceed 40. If λ × W > 40, overflow waits. The sim will not invent a 41st busy slot.",
      require: "none",
    },
    {
      id: "pressure",
      title: "Encounter pressure",
      body: "Traffic climbs or holds stretch. Slots fill; waiters appear beside the grid. The incident is resource contention on a shared pool. Not a bug in the query text.",
      prediction: "Before the surge: what happens to new vs in-flight work if you disable the flag?",
      require: "see_waiters",
    },
    {
      id: "decide",
      title: "Decide",
      body: "Pause freezes exposure at the current % (traffic continues; cohort cannot grow). Disable routes new traffic to the baseline path while in-flight holds finish. Investigate leaves pressure running. Your choice mutates this same system. Then we review what happened. In sandbox you can also try acquire timeout, shed-at-util, and cache.",
      require: "decision",
    },
    {
      id: "debrief",
      title: "After your choice",
      body: "Name the shared resource (40-slot pool), explain why waiting appeared, and state what disable did to new vs in-flight requests. Then enter sandbox and pressure mitigations yourself.",
      require: "none",
    },
    {
      id: "sandbox",
      title: "Sandbox",
      body: "Vary traffic, exposure, lookup duration, acquire timeout, load shed, and cache hit rate. Same rules. Disable under pressure and watch new arrivals skip the long path while in-flight holds drain.",
      require: "none",
    },
  ],
  debriefTemplates: {
    pause_exposure:
      "You paused exposure at {exposure}%. The rollout stopped raising the cohort. Traffic kept arriving at that mix, so anyone hashed into the {exposure}% still hit the extra lookup. Waiters {waiterOutcome}. Pausing does not cut λ and does not kill in-flight holds; it only freezes further exposure increases. Disable (or shed/cache) is what drops recommendation demand. In production you’d still watch pool.pending and acquire.wait.p99.",
    disable_feature:
      "You disabled recommendations for new traffic. New requests took the baseline path (~12ms holds) and stopped acquiring connections for the extra query. In-flight recommendation requests kept their slots until they finished. Disable does not kill work already holding a connection. Waiting drained as those holds completed and arrivals no longer needed the long path. Shared resource: the 40-slot connection pool. Ops signature: pool.pending ↓, acquire.timeouts stop rising, p99 falls toward baseline.",
    investigate:
      "You chose to investigate while pressure continued. Active slots stayed capped at 40; waiters grew as λ × W exceeded capacity. Correct code still caused waiting because every exposed request synchronously acquired from the same finite pool. Without pausing or disabling, new recommendation traffic kept competing with in-flight work. Expect SLO burn and, if connectionTimeout is armed, acquire.timeouts.",
  },
};
