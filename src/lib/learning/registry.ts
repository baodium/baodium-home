/**
 * Shared chapter / lesson registry — single source of truth for titles,
 * book hrefs, labs, and drill chapter links. Keeps Experience, Play, and
 * book naming in sync (e.g. Ch3 is State/Identity, not invented topics).
 */

export type LessonKind = "book" | "lab" | "drill";

export type DrillLink = {
  slug: string;
  title: string;
  href: string;
};

/** full = guided incident on the shared clock. short = a smaller lab. book = prose only. */
export type LabKind = "full" | "short" | "book";

export type ChapterRecord = {
  id: string;
  slug: string;
  number: number;
  /** Canonical title from the manuscript / book catalog. */
  title: string;
  /** Short label for nav chips and drill cards. */
  shortTitle: string;
  bookHref: string;
  labHref: string | null;
  labKind: LabKind;
  labStatus: "ready" | "soon" | "none";
  /** Honest one-line status for the directory. */
  statusLine: string;
  /** One-line lab subtitle when a lab exists. */
  labSubtitle: string;
  /** Play drills that deepen this chapter (implemented only). */
  drills: DrillLink[];
};

/** Canonical chapter list aligned with Practical System Design manuscript. */
export const CHAPTERS: ChapterRecord[] = [
  {
    id: "chapter-1",
    slug: "chapter-1",
    number: 1,
    title: "Resource Contention in Production",
    shortTitle: "Resource contention",
    bookHref: "/system-design/chapter-1",
    labHref: "/system-design/experience/chapter-1",
    labKind: "full",
    labStatus: "ready",
    statusLine: "Full incident. Recommendations, a feature flag, and a 40-slot pool.",
    labSubtitle: "Recommendations, a feature flag, and a 40-slot pool",
    drills: [{ slug: "slo-watch", title: "SLO Watch", href: "/play/slo-watch" }],
  },
  {
    id: "chapter-2",
    slug: "chapter-2",
    number: 2,
    title: "Modeling Requests, Latency, and Throughput",
    shortTitle: "Requests, latency, throughput",
    bookHref: "/system-design/chapter-2",
    labHref: "/system-design/experience/chapter-2",
    labKind: "short",
    labStatus: "ready",
    statusLine: "Short lab. Build the payload before the connection is acquired.",
    labSubtitle: "Build the payload before the connection is acquired",
    drills: [
      { slug: "traffic-surge", title: "Traffic Surge", href: "/play/traffic-surge" },
      { slug: "tail-latency", title: "Tail Latency", href: "/play/tail-latency" },
    ],
  },
  {
    id: "chapter-3",
    slug: "chapter-3",
    number: 3,
    title: "State, Identity, and the Cost of Uncertainty",
    shortTitle: "State, identity, uncertainty",
    bookHref: "/system-design/chapter-3",
    labHref: "/system-design/experience/chapter-3",
    labKind: "full",
    labStatus: "ready",
    statusLine: "Full incident. One charge when the provider answers after the timeout.",
    labSubtitle: "One charge when the provider answers after the client has given up",
    drills: [],
  },
  {
    id: "chapter-4",
    slug: "chapter-4",
    number: 4,
    title: "Service Communication and Cascading Failure",
    shortTitle: "Cascading failure",
    bookHref: "/system-design/chapter-4",
    labHref: "/system-design/experience/chapter-4",
    labKind: "short",
    labStatus: "ready",
    statusLine: "Short lab. A child deadline and a permit on the fraud call.",
    labSubtitle: "A child deadline and a permit on the fraud call",
    drills: [{ slug: "cascade", title: "Cascade", href: "/play/cascade" }],
  },
  {
    id: "chapter-5",
    slug: "chapter-5",
    number: 5,
    title: "Caching and Data Freshness",
    shortTitle: "Caching",
    bookHref: "/system-design/chapter-5",
    labHref: "/system-design/experience/chapter-5",
    labKind: "short",
    labStatus: "ready",
    statusLine: "Short lab. One catalog read when product metadata misses.",
    labSubtitle: "One catalog read when product metadata misses",
    drills: [{ slug: "cache-roulette", title: "Cache Roulette", href: "/play/cache-roulette" }],
  },
  {
    id: "chapter-6",
    slug: "chapter-6",
    number: 6,
    title: "Containers and the Reproducible Deployment",
    shortTitle: "Containers",
    bookHref: "/system-design/chapter-6",
    labHref: null,
    labKind: "book",
    labStatus: "none",
    statusLine: "In the book. No lab yet.",
    labSubtitle: "In the book. No lab yet.",
    drills: [],
  },
  {
    id: "chapter-7",
    slug: "chapter-7",
    number: 7,
    title: "Replicas, Partitions, and Shards",
    shortTitle: "Replicas and shards",
    bookHref: "/system-design/chapter-7",
    labHref: "/system-design/experience/chapter-7",
    labKind: "short",
    labStatus: "ready",
    statusLine: "Short lab. choose_read_target for the address just saved.",
    labSubtitle: "choose_read_target for the address just saved",
    drills: [],
  },
  {
    id: "chapter-8",
    slug: "chapter-8",
    number: 8,
    title: "Observability and Path Health",
    shortTitle: "Observability",
    bookHref: "/system-design/chapter-8",
    labHref: null,
    labKind: "book",
    labStatus: "none",
    statusLine: "In the book. No lab yet.",
    labSubtitle: "In the book. No lab yet.",
    drills: [],
  },
  {
    id: "chapter-9",
    slug: "chapter-9",
    number: 9,
    title: "Guardrails and Failure Containment",
    shortTitle: "Guardrails",
    bookHref: "/system-design/chapter-9",
    labHref: null,
    labKind: "book",
    labStatus: "none",
    statusLine: "In the book. No lab yet.",
    labSubtitle: "In the book. No lab yet.",
    drills: [],
  },
  {
    id: "chapter-10",
    slug: "chapter-10",
    number: 10,
    title: "Deployments as Controlled Experiments",
    shortTitle: "Controlled experiments",
    bookHref: "/system-design/chapter-10",
    labHref: null,
    labKind: "book",
    labStatus: "none",
    statusLine: "In the book. No lab yet.",
    labSubtitle: "In the book. No lab yet.",
    drills: [],
  },
  {
    id: "chapter-11",
    slug: "chapter-11",
    number: 11,
    title: "Service Decomposition",
    shortTitle: "Decomposition",
    bookHref: "/system-design/chapter-11",
    labHref: null,
    labKind: "book",
    labStatus: "none",
    statusLine: "In the book. No lab yet.",
    labSubtitle: "In the book. No lab yet.",
    drills: [],
  },
  {
    id: "chapter-12",
    slug: "chapter-12",
    number: 12,
    title: "Event-Driven Systems and Stream Processing",
    shortTitle: "Events and streams",
    bookHref: "/system-design/chapter-12",
    labHref: "/system-design/experience/chapter-12",
    labKind: "short",
    labStatus: "ready",
    statusLine: "Short lab. Claim the message, then commit the offset.",
    labSubtitle: "Claim the message, then commit the offset",
    drills: [],
  },
  {
    id: "chapter-13",
    slug: "chapter-13",
    number: 13,
    title: "Machine Learning Systems in Production",
    shortTitle: "ML in production",
    bookHref: "/system-design/chapter-13",
    labHref: null,
    labKind: "book",
    labStatus: "none",
    statusLine: "In the book. No lab yet.",
    labSubtitle: "In the book. No lab yet.",
    drills: [],
  },
  {
    id: "chapter-14",
    slug: "chapter-14",
    number: 14,
    title: "Designing From Production Experience",
    shortTitle: "Production experience",
    bookHref: "/system-design/chapter-14",
    labHref: "/system-design/experience/chapter-14",
    labKind: "short",
    labStatus: "ready",
    statusLine: "Short lab. European Catalog pools when one instance is down.",
    labSubtitle: "European Catalog pools when one instance is down",
    drills: [],
  },
];

export function getChapter(slug: string): ChapterRecord | undefined {
  return CHAPTERS.find((c) => c.slug === slug || c.id === slug);
}

export function chapterLabel(slug: string): string {
  const ch = getChapter(slug);
  if (!ch) return slug;
  return `Ch.${ch.number} · ${ch.shortTitle}`;
}

export function labChapters(): ChapterRecord[] {
  return CHAPTERS.filter((c) => c.labStatus !== "none");
}

export function directoryStatus(chapter: ChapterRecord): string {
  if (chapter.labKind === "full") return "Full incident";
  if (chapter.labKind === "short") return "Short lab";
  return "In the book";
}

/** Reader-facing lab link. Names the incident. Book-only chapters stay on the prose. */
export function labActionLabel(chapter: ChapterRecord): string | null {
  if (!chapter.labHref) return null;
  if (chapter.number === 1) return "The product page and the pool";
  return chapter.labSubtitle;
}

/** Map a Play drill slug to its book chapter label + href from the registry. */
export function drillChapterMeta(drillSlug: string): {
  chapterHref: string;
  chapterLabel: string;
} | null {
  const ch = CHAPTERS.find((c) => c.drills.some((d) => d.slug === drillSlug));
  if (!ch) return null;
  return { chapterHref: ch.bookHref, chapterLabel: chapterLabel(ch.slug) };
}

/** Guided stages A–H for Chapter 1 (Practice/Challenge are modes, not stages). */
export const CH1_GUIDED_STAGE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const CH1_GUIDED_STAGE_COUNT = CH1_GUIDED_STAGE_LETTERS.length;
