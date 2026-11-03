/** Manuscript figures already shipped with the book. Cards and chrome use these, not invented art. */

export type ChapterFigure = {
  src: string;
  alt: string;
};

const FIGURES: Record<string, ChapterFigure> = {
  "chapter-1": {
    src: "/book/figures/ch01_2.png",
    alt: "Chapter 1 figure. Product Page calls Catalog and Recommendation, and the pool sits on that path.",
  },
  "chapter-2": {
    src: "/book/figures/ch02_boundaries.png",
    alt: "Chapter 2 figure. Acquisition wait, connection hold, and the work that remains after the query.",
  },
  "chapter-3": {
    src: "/book/figures/ch03_outbox.png",
    alt: "Chapter 3 figure. The charge and the outbox written in one transaction.",
  },
  "chapter-4": {
    src: "/book/figures/ch04_deadline.png",
    alt: "Chapter 4 figure. Time left as the fraud call moves from checkout to the provider.",
  },
  "chapter-5": {
    src: "/book/figures/ch05_cache_aside.png",
    alt: "Chapter 5 figure. Cache-aside read for product metadata.",
  },
  "chapter-6": {
    src: "/book/figures/ch06_layers.png",
    alt: "Chapter 6 figure. Image layers in a reproducible deployment.",
  },
  "chapter-7": {
    src: "/book/figures/ch07_sources.png",
    alt: "Chapter 7 figure. Read sources for a value that was just written.",
  },
  "chapter-8": {
    src: "/book/figures/ch08_trace.png",
    alt: "Chapter 8 figure. A trace across the request path.",
  },
  "chapter-9": {
    src: "/book/figures/ch09_bulkhead.png",
    alt: "Chapter 9 figure. A bulkhead around one dependency.",
  },
  "chapter-10": {
    src: "/book/figures/ch10_bluegreen.png",
    alt: "Chapter 10 figure. Blue-green deployment of one service.",
  },
  "chapter-11": {
    src: "/book/figures/ch11_1.png",
    alt: "Chapter 11 figure. A service split along a boundary.",
  },
  "chapter-12": {
    src: "/book/figures/ch12_partitions.png",
    alt: "Chapter 12 figure. Partitions on the order-events log.",
  },
  "chapter-13": {
    src: "/book/figures/ch13_kv.png",
    alt: "Chapter 13 figure. A key-value lookup on the model path.",
  },
  "chapter-14": {
    src: "/book/figures/ch14_budget.png",
    alt: "Chapter 14 figure. Connection budget for the catalog pools.",
  },
};

export function figureForChapter(id: number | string): ChapterFigure | null {
  const key = typeof id === "number" ? `chapter-${id}` : id;
  return FIGURES[key] ?? null;
}

export function figureForHref(href: string): ChapterFigure | null {
  const match = href.match(/chapter-\d+/);
  return match ? figureForChapter(match[0]) : null;
}
