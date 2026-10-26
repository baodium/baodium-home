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
    durationMin: 10,
  },
  brief:
    "You’re adding recommendations to the product page. Code is ready; tests pass. Enable for a small group and check how the system responds.",
  assumptions: [
    "Simulated metrics — not live production telemetry.",
    "Pool size fixed at 40 connections (shared across the product service).",
    "Recommendation path holds a DB connection ~70ms; baseline page ~12ms.",
    "Feature flag uses stable user hashing; deploy ≠ enable.",
    "Disabling the flag stops new recommendation work; in-flight requests finish.",
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
      body: "Toggle between the current product page and the proposed page with recommendations. Same request path — one extra lookup when the flag is on for the user.",
      require: "toggle_preview",
    },
    {
      id: "review",
      title: "Review the change",
      body: "The diff is small: an extra DB lookup behind a feature flag. Deploy with 0% exposure first — ship the code without anyone hitting the new path — then enable.",
      require: "deploy_zero",
    },
    {
      id: "trace",
      title: "Trace one request",
      body: "Send a single request. Watch the code line highlight, a pool slot acquire, the DB call, then release. Correct code still consumes a shared connection.",
      require: "trace_request",
    },
    {
      id: "rollout",
      title: "Begin rollout",
      body: "Raise exposure to 5%, then 25%. Assignment is stable — the same users stay in or out as you change the percentage.",
      prediction: "At 25% with ~80 req/s and ~70ms holds for exposed users, will demand stay under 40 slots?",
      require: "exposure_25",
    },
    {
      id: "inspect_prod",
      title: "Inspect production",
      body: "Look at the pool grid, waiters, and latency. Active connections can never exceed 40. Little’s Law estimates demand: λ × W. If demand > 40, the overflow waits.",
      require: "none",
    },
    {
      id: "pressure",
      title: "Encounter pressure",
      body: "Traffic climbs (or lookups stretch). Slots fill. Waiters appear beside the grid — not a 41st busy slot. Correct code caused waiting because the pool is shared and finite.",
      prediction: "Before the surge: what happens to new vs in-flight work if you disable the flag?",
      require: "see_waiters",
    },
    {
      id: "decide",
      title: "Decide",
      body: "Pause exposure, disable the feature for new traffic, or keep investigating. Your choice changes this same system — then we’ll debrief what actually happened.",
      require: "decision",
    },
    {
      id: "debrief",
      title: "Debrief",
      body: "Replay your actions against the timeline. Name the shared resource, explain the waiting, and state what disable did to new vs in-flight requests.",
      require: "none",
    },
    {
      id: "sandbox",
      title: "Sandbox",
      body: "Vary traffic, exposure, and lookup duration. Same visuals. Link back to the chapter when you want the prose.",
      require: "none",
    },
  ],
  debriefTemplates: {
    pause_exposure:
      "You paused exposure at {exposure}%. New users stopped joining the recommendation cohort, but anyone already exposed kept hitting the extra lookup. Waiters {waiterOutcome}. The pool stayed the shared bottleneck — pausing slows growth of demand; it does not instantly drain in-flight holds.",
    disable_feature:
      "You disabled recommendations for new traffic. New requests took the baseline path (~12ms holds) and stopped acquiring connections for the extra query. In-flight recommendation requests kept their slots until they finished — disable does not kill work already holding a connection. Waiting drained as those holds completed and arrivals no longer needed the long path. Shared resource: the 40-slot connection pool.",
    investigate:
      "You chose to investigate while pressure continued. Active slots stayed capped at 40; waiters grew as λ × W exceeded capacity. Correct code still caused waiting because every exposed request synchronously acquired from the same finite pool. Without pausing or disabling, new recommendation traffic kept competing with in-flight work.",
  },
};
