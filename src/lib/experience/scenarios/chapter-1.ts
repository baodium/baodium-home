import type { ChapterScenario } from "@/lib/experience/scenarios/types";
import { getChapter } from "@/lib/learning/registry";

const ch = getChapter("chapter-1")!;

export const chapter1Scenario: ChapterScenario = {
  meta: {
    id: ch.id,
    slug: ch.slug,
    number: ch.number,
    title: "Resource Contention",
    subtitle: ch.labSubtitle,
    bookHref: ch.bookHref,
    status: "ready",
    durationMin: 12,
  },
  brief:
    "Monday 11:40, product page. Catalog reads are fine, about 12 ms, and that lookup stays on Product Page. The recommendation code is ready and the tests pass. Personalized traffic will leave Product Page, call Recommendation, and only then take a connection from the 40-slot pool Recommendation owns. You are the one turning the flag on for a small cohort.",
  assumptions: [
    "Simulated metrics shaped like pool.active / pool.pending / acquire.wait / acquire.timeouts (not live telemetry).",
    "Pool size fixed at 40 connections, owned by Recommendation — never inside Product Page.",
    "Baseline path: Client → Product Page → Catalog (~12ms). Personalized: Product Page → Recommendation → pool → DB (~70ms hold).",
    "Feature flag uses stable user hashing. A change reaches new arrivals after a short propagation delay. In-flight holds continue.",
    "Disabling the flag stops new recommendation work; in-flight requests finish their holds.",
    "Acquire timeout maps to connectionTimeout; load shed skips recs when util is high; cache shortens W.",
    "Latency SLO target: p99 < 200ms (simulated error-budget burn).",
  ],
  codeLines: [
    "async function getProductPage(req) {",
    "  const product = await catalog.get(req.productId);",
    "  let recommendations = [];",
    "  if (flags.recommendations.enabledFor(req.userId)) {",
    "    // Product Page calls Recommendation — it does not own the pool",
    "    recommendations = await recommendation.get(req.productId);",
    "  }",
    "  return render({ product, recommendations });",
    "}",
    "",
    "// Recommendation service — owns the shared 40-conn pool",
    "async function recommendation.get(productId) {",
    "  const conn = await pool.acquire();          // ← shared pool",
    "  try {",
    "    return await conn.query(",
    "      `SELECT … FROM recommendations WHERE product_id = $1`,",
    "      [productId],",
    "    );",
    "  } finally {",
    "    pool.release(conn);",
    "  }",
    "}",
  ],
  steps: [
    {
      id: "inspect",
      letter: "A",
      title: "Inspect the feature",
      body: "Toggle the product page preview. Recommendations appear as a rail on the page. The catalog lookup stays on Product Page. The expensive path will live in Recommendation, behind a feature flag, still invisible to live traffic until exposure rises.",
      require: "toggle_preview",
    },
    {
      id: "deploy",
      letter: "B",
      title: "Deploy with the flag off",
      body: "Ship the code at 0% exposure. Deploy is not enable: the binary can be live while nobody is hashed into the cohort. You will raise exposure later without another deploy.",
      require: "deploy_zero",
    },
    {
      id: "trace",
      letter: "C",
      title: "Trace one request",
      body: "Send one personalized request. Watch Product Page call Recommendation, then a pool slot acquire, the DB hold, and release. Correct code still consumes a shared connection from a finite pool owned by Recommendation.",
      require: "trace_request",
    },
    {
      id: "exposure",
      letter: "D",
      title: "Increase exposure",
      body: "Raise exposure to 5%, then 25%. Stable hashing keeps the same users in or out, and the new cohort reaches arrivals after a short delay. Pool demand is the exposed arrival rate times the recommendation hold. At 25% of about 80 req/s the pool sees about 20 acquires per second. Catalog lookups stay on Product Page. Predict before 25%, then check the measured outcome.",
      prediction:
        "At 25% with ~80 req/s and ~70ms holds for exposed users, will demand stay under 40 slots?",
      require: "exposure_25",
    },
    {
      id: "saturation",
      letter: "E",
      title: "Saturation",
      body: "Traffic climbs or holds stretch. Slots fill; waiters appear beside the grid. Busy never exceeds 40. Overflow waits. Read pool.active, pool.pending, and acquire.wait.p99. The incident is resource contention on Recommendation’s shared pool — not a bug in the query text.",
      prediction:
        "Before the surge settles: what happens to new vs in-flight work if you disable the flag?",
      require: "see_waiters",
    },
    {
      id: "investigate",
      letter: "F",
      title: "Investigate",
      body: "Pause and read the system. Compare baseline vs recommendation path latency. Note utilization, pending, acquire wait, and whether the p99 SLO is burning. Form a hypothesis before you change anything.",
      require: "none",
    },
    {
      id: "mitigate",
      letter: "G",
      title: "Mitigate",
      body: "Choose a response. Pause freezes exposure at the current % (traffic continues; the cohort cannot grow). Disable routes new traffic to the baseline path while in-flight holds finish. Investigate leaves pressure running so you can try timeout, shed, or cache afterward. Your choice mutates this same system.",
      require: "decision",
    },
    {
      id: "review",
      letter: "H",
      title: "Review",
      body: "Name the shared resource (Recommendation’s 40-slot pool), explain why waiting appeared, and state what disable did to new vs in-flight requests. Then open Practice or Challenge with the same engine.",
      require: "none",
    },
  ],
  debriefTemplates: {
    pause_exposure:
      "You paused exposure at {exposure}%. The rollout stopped raising the cohort. Traffic kept arriving at that mix, so anyone hashed into the {exposure}% still hit Recommendation and the shared pool. Waiters {waiterOutcome}. Pausing does not cut λ and does not kill in-flight holds; it only freezes further exposure increases. Disable (or shed/cache) is what drops recommendation demand. In production you would still watch pool.pending and acquire.wait.p99.",
    disable_feature:
      "You disabled recommendations for new traffic. New requests stayed on Product Page → Catalog (~12ms) and stopped calling Recommendation. In-flight recommendation requests kept their pool slots until they finished. Disable does not kill work already holding a connection. Waiting drained as those holds completed. Shared resource: the 40-slot connection pool inside Recommendation. Ops signature: pool.pending ↓, acquire.timeouts stop rising, p99 falls toward baseline.",
    investigate:
      "You chose to keep investigating while pressure continued. Active slots stayed capped at 40; waiters grew as λ × W exceeded capacity. Correct code still caused waiting because every exposed request synchronously acquired from Recommendation’s finite pool. Without pausing or disabling, new recommendation traffic kept competing with in-flight work. Expect SLO burn and, if connectionTimeout is armed, acquire.timeouts.",
  },
  challenge: {
    title: "Can you clear the pool under live pressure?",
    objective:
      "The storefront is already saturated. Waiting requests are stacking beside the 40-slot pool. Bring the system back under the latency SLO without being told which lever to pull.",
    criteria: {
      maxSimSec: 45,
      requireWaitingZero: true,
      requireP99UnderSlo: true,
      maxUtilization: 0.75,
    },
    success:
      "Waiting cleared, pool util ≤ 75%, and p99 under the 200 ms SLO within 45 sim seconds.",
    gettingStarted:
      "Press Start challenge. Logical time advances while you adjust the flag, exposure, shed, timeout, or cache. Watch Live metrics. Pause, step, or reset anytime.",
  },
};
