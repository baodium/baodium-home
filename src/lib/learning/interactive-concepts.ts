/**
 * Editorial InteractiveConcept placements — bridges from manuscript sections
 * into the implemented Chapter 1 lab and Play drills. Manuscript HTML is never
 * rewritten; the reader injects these after named section headings.
 */

export type ConceptTarget =
  | {
      kind: "lab";
      href: string;
      label: string;
      detail: string;
    }
  | {
      kind: "drill";
      href: string;
      label: string;
      detail: string;
    };

export type InteractiveConceptDef = {
  id: string;
  /** Chapter slug in the book reader (`chapter-1`, …). */
  chapterSlug: string;
  /** Place the card after this section's content (h2/h3 id from manuscript). */
  afterSectionId: string;
  /** Short concept name shown in the kicker. */
  concept: string;
  /** One plain sentence: what to try next. */
  lead: string;
  targets: ConceptTarget[];
};

/** Primary Ch.1 bridges + selective later-chapter links to shipped drills. */
export const INTERACTIVE_CONCEPTS: InteractiveConceptDef[] = [
  {
    id: "ch1-pool-lab",
    chapterSlug: "chapter-1",
    afterSectionId: "connection-pool-measurements",
    concept: "Connection pool pressure",
    lead: "Open the Chapter 1 lab and watch acquire wait climb while the 40-slot pool saturates under the recommendation path.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-1",
        label: "Operate Chapter 1",
        detail: "Flag, pool, and one request path",
      },
    ],
  },
  {
    id: "ch1-demand-slo",
    chapterSlug: "chapter-1",
    afterSectionId: "connection-demand-and-utilization",
    concept: "Demand versus capacity",
    lead: "Hold an error budget while pool util and retries compete, then return here with the numbers still fresh.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-1",
        label: "Chapter 1 lab",
        detail: "Raise exposure and read occupancy",
      },
      {
        kind: "drill",
        href: "/play/slo-watch",
        label: "SLO Watch",
        detail: "Three waves against a shared pool",
      },
    ],
  },
  {
    id: "ch1-queue-boundaries",
    chapterSlug: "chapter-1",
    afterSectionId: "queueing-across-service-boundaries",
    concept: "Queueing at the boundary",
    lead: "See how admission and shedding change who waits when capacity is fixed for a short spike.",
    targets: [
      {
        kind: "drill",
        href: "/play/traffic-surge",
        label: "Traffic Surge",
        detail: "Admit, queue, and shed under a cliff",
      },
    ],
  },
  {
    id: "ch1-retries",
    chapterSlug: "chapter-1",
    afterSectionId: "timeouts-and-retry-traffic",
    concept: "Timeouts and retries",
    lead: "Retries look helpful until they multiply load on a saturated pool. Try the budget drill, then come back to the chapter.",
    targets: [
      {
        kind: "drill",
        href: "/play/slo-watch",
        label: "SLO Watch",
        detail: "Retries versus error budget",
      },
      {
        kind: "lab",
        href: "/system-design/experience/chapter-1",
        label: "Chapter 1 lab",
        detail: "Mitigate without amplifying load",
      },
    ],
  },
  {
    id: "ch1-canary",
    chapterSlug: "chapter-1",
    afterSectionId: "canary-load-and-release-validation",
    concept: "Canary exposure",
    lead: "Walk the guided stages: inspect the feature, raise exposure, then mitigate with the kill switch that leaves in-flight work alone.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-1",
        label: "Guided Chapter 1",
        detail: "Stages A–H on shared sim state",
      },
    ],
  },
  {
    id: "ch1-summary",
    chapterSlug: "chapter-1",
    afterSectionId: "summary",
    concept: "Practice the incident",
    lead: "You have the reasoning. Run the lab end to end, or pick a drill that isolates one failure mode from this chapter.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-1",
        label: "Chapter 1 lab",
        detail: "Full guided incident",
      },
      {
        kind: "drill",
        href: "/play/slo-watch",
        label: "SLO Watch",
        detail: "Pool and budget under waves",
      },
      {
        kind: "drill",
        href: "/play/tail-latency",
        label: "Tail Latency",
        detail: "When p99 diverges from the median",
      },
    ],
  },
  {
    id: "ch2-littles",
    chapterSlug: "chapter-2",
    afterSectionId: "average-concurrency",
    concept: "Concurrency from rate and time",
    lead: "Open the Chapter 2 lab and size the workers from arrival rate and service time before the queue takes off.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-2",
        label: "Chapter 2 lab",
        detail: "Little's Law and the worker count",
      },
    ],
  },
  {
    id: "ch2-tail",
    chapterSlug: "chapter-2",
    afterSectionId: "sec:ch02-variation",
    concept: "Workload variation and tails",
    lead: "Variation shows up in the slowest percentile first. Hold p99 under budget while stragglers arrive.",
    targets: [
      {
        kind: "drill",
        href: "/play/tail-latency",
        label: "Tail Latency",
        detail: "p50 stays calm while p99 climbs",
      },
    ],
  },
  {
    id: "ch2-surge",
    chapterSlug: "chapter-2",
    afterSectionId: "queue-wait-and-recovery-time",
    concept: "Queue wait under a spike",
    lead: "When capacity cannot grow in the first half-minute, admission and shedding decide who still gets a timely response.",
    targets: [
      {
        kind: "drill",
        href: "/play/traffic-surge",
        label: "Traffic Surge",
        detail: "Fixed capacity through the cliff",
      },
    ],
  },
  {
    id: "ch3-identity",
    chapterSlug: "chapter-3",
    afterSectionId: "payment-outcomes-after-timeout",
    concept: "A charge with one identity",
    lead: "The provider can answer after the client has given up. Run the lab and keep the charge to a single operation.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-3",
        label: "Chapter 3 lab",
        detail: "Timeout, identity, and the outbox",
      },
    ],
  },
  {
    id: "ch4-cascade",
    chapterSlug: "chapter-4",
    afterSectionId: "how-a-failure-crosses-service-boundaries",
    concept: "Failure across services",
    lead: "Keep checkout alive when a dependency wobbles. Circuits alone are not enough if every path still shares the pool.",
    targets: [
      {
        kind: "drill",
        href: "/play/cascade",
        label: "Cascade",
        detail: "Breakers, bulkheads, no auth bypass",
      },
    ],
  },
  {
    id: "ch4-deadline",
    chapterSlug: "chapter-4",
    afterSectionId: "deadlines-between-services",
    concept: "Time left on the call",
    lead: "A child with its own timeout can still be working after checkout has returned. Pass the remaining deadline and see the leftover work go to zero.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-4",
        label: "Chapter 4 lab",
        detail: "Deadline, cancel, and leftover work",
      },
    ],
  },
  {
    id: "ch5-cache",
    chapterSlug: "chapter-5",
    afterSectionId: "concurrent-misses-and-refresh-work",
    concept: "Concurrent cache misses",
    lead: "A hot key’s TTL expiry can stampede origin unless fills coalesce. Try the drill, then return to the freshness discussion.",
    targets: [
      {
        kind: "drill",
        href: "/play/cache-roulette",
        label: "Cache Roulette",
        detail: "Singleflight versus thundering herd",
      },
    ],
  },
  {
    id: "ch5-aside",
    chapterSlug: "chapter-5",
    afterSectionId: "the-cache-aside-read-path",
    concept: "The cache-aside read",
    lead: "Follow a read from the app to the cache and on to origin, then line the expiries up and bring origin back down.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-5",
        label: "Chapter 5 lab",
        detail: "Hits, fills, and origin rate",
      },
    ],
  },
  {
    id: "ch7-ryw",
    chapterSlug: "chapter-7",
    afterSectionId: "read-your-writes",
    concept: "Read your own write",
    lead: "Replica lag hides a row you just wrote. Keep those reads correct without sending every read to the primary.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-7",
        label: "Chapter 7 lab",
        detail: "Lag, the primary, and a bound",
      },
    ],
  },
  {
    id: "ch12-age",
    chapterSlug: "chapter-12",
    afterSectionId: "backlog-dynamics",
    concept: "Backlog age",
    lead: "Produce rate, partitions, and a redelivered message. Hold the age of the oldest message, and do not send it twice.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-12",
        label: "Chapter 12 lab",
        detail: "Lag, partitions, and redelivery",
      },
    ],
  },
  {
    id: "ch14-budget",
    chapterSlug: "chapter-14",
    afterSectionId: "deadline-propagation-and-dependency-budgets",
    concept: "The checkout budget",
    lead: "The regional path has to add up. When the provider slows, decide what still sits inside the 500 ms budget.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-14",
        label: "Chapter 14 lab",
        detail: "Path time, retries, and the provider",
      },
    ],
  },
];

export function conceptsForChapter(chapterSlug: string): InteractiveConceptDef[] {
  return INTERACTIVE_CONCEPTS.filter((c) => c.chapterSlug === chapterSlug);
}

/** Build a lab/drill URL that can return the reader to this chapter section. */
export function withReturnToReading(
  href: string,
  chapterSlug: string,
  sectionId: string,
): string {
  const returnPath = `/system-design/${chapterSlug}#${sectionId}`;
  const url = new URL(href, "https://baodium.com");
  url.searchParams.set("from", "book");
  url.searchParams.set("return", returnPath);
  return `${url.pathname}${url.search}`;
}

export function parseReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/system-design")) return null;
  if (raw.includes("//") || raw.includes("\\")) return null;
  return raw;
}
