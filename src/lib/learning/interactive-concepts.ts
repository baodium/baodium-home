/**
 * Bridges from a manuscript section to the lab or drill that runs that section's code.
 * One card per shipped lab or drill, on a heading that exists in the current manuscript HTML.
 */

export type ConceptTarget =
  | { kind: "lab"; href: string; label: string; detail: string }
  | { kind: "drill"; href: string; label: string; detail: string };

export type InteractiveConceptDef = {
  id: string;
  chapterSlug: string;
  afterSectionId: string;
  concept: string;
  lead: string;
  targets: ConceptTarget[];
};

export const INTERACTIVE_CONCEPTS: InteractiveConceptDef[] = [
  {
    id: "ch1-pool",
    chapterSlug: "chapter-1",
    afterSectionId: "diagnosing-connection-pool-saturation",
    concept: "The 40-connection pool",
    lead: "The readout on this page is the lab: 40 connections assigned, pending acquisitions, acquire time, and a query that stays near its baseline.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-1",
        label: "Chapter 1 lab",
        detail: "Recommendation, the flag, and the shared pool",
      },
      {
        kind: "drill",
        href: "/play/slo-watch",
        label: "SLO Watch",
        detail: "The burst against the same 40 connections",
      },
    ],
  },
  {
    id: "ch2-payload",
    chapterSlug: "chapter-2",
    afterSectionId: "shortening-the-time-on-the-scarce-resource",
    concept: "Build, then acquire",
    lead: "The two listings differ by whether build_payload runs while the connection is already assigned.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-2",
        label: "Chapter 2 lab",
        detail: "40 connections, 400 lookups a second, 70 ms",
      },
    ],
  },
  {
    id: "ch2-tail",
    chapterSlug: "chapter-2",
    afterSectionId: "concurrency-and-resource-occupancy",
    concept: "Acquire time",
    lead: "Occupancy is the time a connection is held. The tail that moves under load is the wait to acquire one.",
    targets: [
      {
        kind: "drill",
        href: "/play/tail-latency",
        label: "Tail Latency",
        detail: "Acquire p95 against a query that stays at 70 ms",
      },
    ],
  },
  {
    id: "ch2-admission",
    chapterSlug: "chapter-2",
    afterSectionId: "load-test-saturation-and-admission",
    concept: "The passing stage",
    lead: "400 a second passes. 480 a second rejects about 2 percent even though acquire p95 is still 25 ms.",
    targets: [
      {
        kind: "drill",
        href: "/play/traffic-surge",
        label: "Traffic Surge",
        detail: "Set the admission limit on the last passing stage",
      },
    ],
  },
  {
    id: "ch3-timeout",
    chapterSlug: "chapter-3",
    afterSectionId: "timeouts-and-uncertain-remote-outcomes",
    concept: "One charge",
    lead: "The provider can still settle the authorization after the client has stopped waiting. The retry has to carry the same operation.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-3",
        label: "Chapter 3 lab",
        detail: "Idempotency-Key, one charge, the outbox row",
      },
    ],
  },
  {
    id: "ch4-deadline",
    chapterSlug: "chapter-4",
    afterSectionId: "deadlines-between-services",
    concept: "The fraud deadline",
    lead: "reserve_fraud_call cuts a child deadline from the time checkout has left and takes an outbound permit before the provider is called.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-4",
        label: "Chapter 4 lab",
        detail: "Child deadline, permit, cancellation",
      },
    ],
  },
  {
    id: "ch4-cancel",
    chapterSlug: "chapter-4",
    afterSectionId: "cross-service-failure-propagation",
    concept: "Work that continues",
    lead: "A provider that does not see cancellation keeps running after checkout has returned.",
    targets: [
      {
        kind: "drill",
        href: "/play/cascade",
        label: "Cascade",
        detail: "Stop the fraud provider with the caller",
      },
    ],
  },
  {
    id: "ch5-aside",
    chapterSlug: "chapter-5",
    afterSectionId: "the-cache-aside-read-path",
    concept: "product-metadata",
    lead: "get_product_metadata reads product-metadata:v1 with a 300 second TTL, and misses fall through to Catalog.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-5",
        label: "Chapter 5 lab",
        detail: "One key, one loader, one source permit",
      },
    ],
  },
  {
    id: "ch5-miss",
    chapterSlug: "chapter-5",
    afterSectionId: "concurrent-misses-and-refresh-work",
    concept: "One loader",
    lead: "Concurrent misses on the same key share one loader. That loader still has to acquire a source permit.",
    targets: [
      {
        kind: "drill",
        href: "/play/cache-roulette",
        label: "Cache Roulette",
        detail: "The missed product-metadata key",
      },
    ],
  },
  {
    id: "ch7-read",
    chapterSlug: "chapter-7",
    afterSectionId: "read-your-writes",
    concept: "The address just saved",
    lead: "choose_read_target returns a replica only when it is available, the lag sample is current, and the policy accepts it.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-7",
        label: "Chapter 7 lab",
        detail: "Replica, primary fallback, or unavailable",
      },
    ],
  },
  {
    id: "ch12-claim",
    chapterSlug: "chapter-12",
    afterSectionId: "idempotent-consumers",
    concept: "One notification task",
    lead: "process_order_event claims the message_id, creates the task on the first delivery, and commits the offset after that transaction.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-12",
        label: "Chapter 12 lab",
        detail: "12 partitions, claim, then commit",
      },
    ],
  },
  {
    id: "ch14-pools",
    chapterSlug: "chapter-14",
    afterSectionId: "connection-pool-sizing",
    concept: "European Catalog",
    lead: "1,440 reads a second at 12 ms is about 17.3 connections across the region. The pools you open are a different number.",
    targets: [
      {
        kind: "lab",
        href: "/system-design/experience/chapter-14",
        label: "Chapter 14 lab",
        detail: "17.3, the planning case, four pools of 20",
      },
    ],
  },
];

export function conceptsForChapter(chapterSlug: string): InteractiveConceptDef[] {
  return INTERACTIVE_CONCEPTS.filter((c) => c.chapterSlug === chapterSlug);
}

/** Build a lab/drill URL that can return the reader to this chapter section. */
export function withReturnToReading(href: string, chapterSlug: string, sectionId: string): string {
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
