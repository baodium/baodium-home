/**
 * Shared chapter / lesson registry — single source of truth for titles,
 * book hrefs, labs, and drill chapter links. Keeps Experience, Play, and
 * book naming in sync (e.g. Ch3 is State/Identity, not invented topics).
 */

export type LessonKind = "book" | "lab" | "drill";

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

/** Guided stages A–H for Chapter 1 (Practice/Challenge are modes, not stages). */
export const CH1_GUIDED_STAGE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const CH1_GUIDED_STAGE_COUNT = CH1_GUIDED_STAGE_LETTERS.length;
