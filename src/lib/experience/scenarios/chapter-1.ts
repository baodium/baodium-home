import { CHAPTER1_SOURCE } from "@/lib/experience/chapter1-program";
import type { ChapterScenario } from "@/lib/experience/scenarios/types";
import { getChapter } from "@/lib/learning/registry";

const ch = getChapter("chapter-1")!;

export const chapter1Scenario: ChapterScenario = {
  meta: {
    id: ch.id,
    slug: ch.slug,
    number: ch.number,
    title: ch.title,
    subtitle: ch.labSubtitle,
    bookHref: ch.bookHref,
    status: "ready",
    durationMin: 12,
  },
  brief:
    "Monday, product page. Catalog still answers on Product Page and does not take a database connection. The recommendation code is ready and the tests pass. Personalized traffic calls Recommendation, and that service borrows from the same 40-connection pool the home page and checkout already use. You are turning the flag on for a small cohort.",
  assumptions: [
    "Simulated metrics shaped like pool.active / pool.pending / acquire.wait / acquire.timeouts (not live telemetry).",
    "Each Recommendation instance allows 40 connections. Home page, checkout, and product-page personalization share that pool. Product Page does not hold the connection.",
    "Baseline path: Client → Product Page → Catalog, no pool slot. Personalized: Product Page → Recommendation → pool → database. The incident’s mean occupancy was about 70 ms, with acquire p99 near 600 ms while all 40 connections were assigned.",
    "Feature flag uses stable user hashing. A change reaches new arrivals after a short propagation delay. In-flight holds continue.",
    "Disabling the flag stops new recommendation calls. Requests already waiting for a connection still finish or time out. The query stays near its baseline. Acquire time is the queue.",
    "A later design capped each Product Page instance at 16 in-flight recommendation calls. This lab stays on the incident above, not that limiter.",
  ],
  codeLines: CHAPTER1_SOURCE.split("\n"),
  steps: [
    {
      id: "inspect",
      letter: "A",
      title: "Inspect the feature",
      body: "Run get_product_page. Catalog is fetched on Product Page and does not take a connection. With the flag off, the handler does not call Recommendation, so the page has no recommendation row and the pool stays idle. The row appears when the flag lets a request through and the call is still in the listing. Comment out that call and the pool is not asked for a slot.",
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
      body: "Send one personalized request. Watch Product Page call Recommendation, then a pool slot acquire, the database hold, and release. Correct code still borrows a connection from the finite pool the home page and checkout already use.",
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
      body: "Traffic climbs or holds stretch. Slots fill; waiters appear beside the grid. Busy never exceeds 40. Overflow waits. In the incident, all 40 connections were assigned, about 80 requests were pending, query time stayed near baseline, and acquire p99 was about 600 ms. The delay is the wait for a connection, not the SQL.",
      prediction:
        "Before the surge settles: what happens to new vs in-flight work if you disable the flag?",
      require: "see_waiters",
    },
    {
      id: "investigate",
      letter: "F",
      title: "Investigate",
      body: "Pause and read the system. Compare the catalog path with the recommendation path. Note pending acquisitions, acquire wait, and whether the query stayed near baseline. The delay you are looking for is the wait for a connection.",
      require: "none",
    },
    {
      id: "mitigate",
      letter: "G",
      title: "Mitigate",
      body: "Choose a response. Pause freezes exposure at the current percent, so the cohort cannot grow. Disable stops new recommendation calls while holds already taken finish or time out. Investigate leaves the pressure running so you can watch the queue.",
      require: "decision",
    },
    {
      id: "review",
      letter: "H",
      title: "Review",
      body: "Name the shared resource: Recommendation’s 40-connection pool, already used by the home page and checkout. Say what disable did to new requests versus work already holding a connection. The design that followed capped each Product Page instance at 16 in-flight recommendation calls and about 150 ms. Then open Practice or Challenge with the same engine.",
      require: "none",
    },
  ],
  debriefTemplates: {
    pause_exposure:
      "You paused exposure at {exposure}%. The rollout stopped raising the cohort. Traffic kept arriving at that mix, so anyone hashed into the {exposure}% still hit Recommendation and the shared pool. Waiters {waiterOutcome}. Pausing does not cut the arrival rate and does not end in-flight holds. Disabling the flag is what stops new recommendation calls.",
    disable_feature:
      "You disabled recommendations for new traffic. New product pages stayed on Catalog and stopped calling Recommendation. Requests already holding a connection kept it until they finished or timed out. Disable does not cancel that work. Waiting drained as those holds completed. The shared resource is the 40-connection pool inside Recommendation, the same pool the home page and checkout use. Pending falls. The query was already near baseline. Acquire wait is the line that comes down.",
    investigate:
      "You chose to keep investigating while pressure continued. Active connections stayed capped at 40. Pending grew because the arrival rate times the hold exceeded the pool. Correct code still waited because every exposed request acquired from Recommendation’s finite pool. Without pausing or disabling, new recommendation traffic kept competing with in-flight work. Acquire wait stays high. A timeout only ends a wait that already started.",
  },
  challenge: {
    title: "Can you clear the pool under live pressure?",
    objective:
      "Waiting requests are stacking beside the 40-connection pool. Pending acquisitions should finish, and acquire time should come off the queue. The query does not have to change.",
    criteria: {
      maxSimSec: 45,
      requireWaitingZero: true,
      requireP99UnderSlo: true,
      maxUtilization: 0.75,
    },
    success:
      "Pending acquisitions finish, and acquire time comes off the queue, within 45 sim seconds.",
    gettingStarted:
      "Press Start challenge. Logical time advances while you adjust the flag and exposure. Watch pending acquisitions and acquire time. Pause, step, or reset anytime.",
  },
};
