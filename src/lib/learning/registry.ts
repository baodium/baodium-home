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
  labStatus: "ready" | "soon" | "none";
  /** One-line lab subtitle when a lab exists or is planned. */
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
    labStatus: "ready",
    labSubtitle: "Recommendations, a feature flag, and a 40-slot pool",
    drills: [
      { slug: "slo-watch", title: "SLO Watch", href: "/play/slo-watch" },
    ],
  },
  {
    id: "chapter-2",
    slug: "chapter-2",
    number: 2,
    title: "Modeling Requests, Latency, and Throughput",
    shortTitle: "Requests, latency, throughput",
    bookHref: "/system-design/chapter-2",
    labHref: null,
    labStatus: "soon",
    labSubtitle: "Model arrival rate before you size the pool",
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
    labHref: null,
    labStatus: "soon",
    labSubtitle: "What identity and sticky state cost under load",
    drills: [],
  },
  {
    id: "chapter-4",
    slug: "chapter-4",
    number: 4,
    title: "Service Communication and Cascading Failure",
    shortTitle: "Cascading failure",
    bookHref: "/system-design/chapter-4",
    labHref: null,
    labStatus: "soon",
    labSubtitle: "Retries that amplify a saturated dependency",
    drills: [{ slug: "cascade", title: "Cascade", href: "/play/cascade" }],
  },
  {
    id: "chapter-5",
    slug: "chapter-5",
    number: 5,
    title: "Caching and the Cost of Remembering",
    shortTitle: "Caching",
    bookHref: "/system-design/chapter-5",
    labHref: null,
    labStatus: "soon",
    labSubtitle: "TTL expiry without a stampede on origin",
    drills: [
      { slug: "cache-roulette", title: "Cache Roulette", href: "/play/cache-roulette" },
    ],
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
