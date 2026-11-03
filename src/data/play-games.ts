/** Catalog for the /play drills. */

import { drillChapterMeta } from "@/lib/learning/registry";

export type PlayDifficulty = "easy" | "medium" | "spicy";

export type PlayGame = {
  slug: string;
  title: string;
  feel: string;
  notice: string;
  success: string;
  learn: string;
  changed: string;
  matters: string;
  technologies: string[];
  difficulty: PlayDifficulty;
  minutes: string;
  chapterHref: string;
  chapterLabel: string;
  takeaway: string;
  challenge: string;
  preview: {
    primary: { label: string; value: string; tone: "ok" | "warn" | "bad" };
    secondary: { label: string; value: string; tone: "ok" | "warn" | "bad" };
    spark: number[];
    caption: string;
  };
};

export const playGames: PlayGame[] = [
  {
    slug: "slo-watch",
    title: "SLO Watch",
    challenge: "Can you clear the 40-connection pool when the burst lands?",
    feel: "Recommendation shares 40 connections with the home page and checkout. A burst of about 1.7 times the 400 lookups a second estimate fills the spare connections.",
    notice: "Watch pending acquisitions and acquire wait. The query stays near 70 ms.",
    success: "Pending ends at 0 and acquire wait stays under 50 ms. The pool stays at 40.",
    learn: "The flag stops new recommendation calls. A larger pool is not the response in this incident.",
    changed: "Cutting exposure, or turning the flag off, drops new demand. Holds already taken finish on their own.",
    matters: "Acquire p99 near 600 ms with the query still near baseline means the wait is the queue for a connection.",
    technologies: ["Feature flags", "Connection pools", "Little's Law", "Acquire wait"],
    difficulty: "medium",
    minutes: "~1 min",
    chapterHref: drillChapterMeta("slo-watch")?.chapterHref ?? "/system-design/chapter-1",
    chapterLabel: drillChapterMeta("slo-watch")?.chapterLabel ?? "Ch.1 · Resource contention",
    takeaway:
      "Disabling the flag stops new recommendation calls. The query stays near 70 ms. Acquire wait is the line that was the queue.",
    preview: {
      primary: { label: "Acquire", value: "600 ms", tone: "bad" },
      secondary: { label: "Pending", value: "80", tone: "bad" },
      spark: [0.3, 0.35, 0.42, 0.7, 0.9, 0.95, 0.8, 0.55],
      caption: "40 connections assigned. Query still near 70 ms.",
    },
  },
  {
    slug: "traffic-surge",
    title: "Traffic Surge",
    challenge: "Can you keep acquire p95 under 50 ms on the last passing stage?",
    feel: "The load test walks 300, 400, 480, and 560 lookups a second. Two of those stages pass. Two do not.",
    notice: "A stage can show acquire p95 under 50 ms and still fail, because rejections crossed 1 percent.",
    success: "Admission sits at 400/s. Acquire p95 stays under 50 ms and rejections stay under 1 percent.",
    learn: "The pass bar is both numbers. The admission limit belongs on the last stage that clears both.",
    changed: "Stopping the test at 400 per second keeps the run on the passing rows of the table.",
    matters: "At 480 per second the chapter records about 2 percent rejected, with acquire p95 still at 25 ms.",
    technologies: ["Little's Law", "Load tests", "Admission limits", "Acquire p95"],
    difficulty: "easy",
    minutes: "~45s",
    chapterHref: drillChapterMeta("traffic-surge")?.chapterHref ?? "/system-design/chapter-2",
    chapterLabel: drillChapterMeta("traffic-surge")?.chapterLabel ?? "Ch.2 · Requests, latency, throughput",
    takeaway:
      "400 lookups a second is the last passing stage. That is where the admission limit sits.",
    preview: {
      primary: { label: "Acquire p95", value: "80 ms", tone: "bad" },
      secondary: { label: "Rejected", value: "21%", tone: "bad" },
      spark: [0.15, 0.2, 0.28, 0.45, 0.7, 0.9, 0.85, 0.6],
      caption: "560/s rejects 120. 400/s does not.",
    },
  },
  {
    slug: "cascade",
    title: "Cascade",
    challenge: "Can you stop the fraud provider when checkout is out of time?",
    feel: "Checkout calls fraud with a child deadline. A slow provider can still be running after checkout has returned.",
    notice: "Watch caller time, the child deadline, and provider work that continues after the caller returns.",
    success: "Leftover provider work is 0 ms, and checkout returns inside the time it had left.",
    learn: "The child deadline is the time left minus the reserve, capped at 1000 ms. Cancellation stops the provider with the caller.",
    changed: "Passing cancellation with the deadline ends provider work that would otherwise continue.",
    matters: "A missing permit defers the call. That is a different branch from stopping a call that already started.",
    technologies: ["Deadlines", "Cancellation", "Outbound permits", "Fraud provider"],
    difficulty: "spicy",
    minutes: "~1 min",
    chapterHref: drillChapterMeta("cascade")?.chapterHref ?? "/system-design/chapter-4",
    chapterLabel: drillChapterMeta("cascade")?.chapterLabel ?? "Ch.4 · Cascading failure",
    takeaway:
      "evaluate_risk receives the child deadline and request.cancellation. The provider stops when checkout is out of time.",
    preview: {
      primary: { label: "Still running", value: "480 ms", tone: "bad" },
      secondary: { label: "Child deadline", value: "420 ms", tone: "warn" },
      spark: [0.2, 0.35, 0.5, 0.72, 0.88, 0.8, 0.6, 0.4],
      caption: "Provider work continues after checkout returns.",
    },
  },
  {
    slug: "cache-roulette",
    title: "Cache Roulette",
    challenge: "Can one catalog read fill a missed product-metadata key?",
    feel: "product-metadata:v1 is cache-aside with a 300 second TTL. On a miss, every reader would call Catalog unless they share one loader.",
    notice: "Watch catalog reads and readers who get source_read_limit when the permit is missing.",
    success: "One catalog read for the miss, and unavailable responses stay at zero.",
    learn: "singleflight.run shares one loader. That loader calls source_reads.try_acquire before Catalog.",
    changed: "Sharing the loader drops catalog reads from the reader count to one.",
    matters: "A permit miss returns TemporarilyUnavailable(source_read_limit) instead of a catalog query.",
    technologies: ["Cache-aside", "TTL", "Shared loader", "Source permits"],
    difficulty: "medium",
    minutes: "~50s",
    chapterHref: drillChapterMeta("cache-roulette")?.chapterHref ?? "/system-design/chapter-5",
    chapterLabel: drillChapterMeta("cache-roulette")?.chapterLabel ?? "Ch.5 · Caching",
    takeaway:
      "A fresh entry does not call Catalog. A miss shares one loader, and that loader needs a source permit.",
    preview: {
      primary: { label: "Catalog reads", value: "80", tone: "bad" },
      secondary: { label: "TTL", value: "300 s", tone: "ok" },
      spark: [0.2, 0.2, 0.9, 0.85, 0.3, 0.25, 0.2, 0.2],
      caption: "One missed key. Many readers.",
    },
  },
  {
    slug: "tail-latency",
    title: "Tail Latency",
    challenge: "Can you keep acquire p95 under 50 ms while the query stays at 70?",
    feel: "The recommendation query holds a connection for about 70 ms and does not slow down. Acquire time does, once the pool is full.",
    notice: "The histogram is acquire time. The query line stays flat.",
    success: "Acquire p95 stays under 50 ms at a lookup rate the load-test table marks as passing.",
    learn: "The tail in this chapter is the wait for a connection, not a second copy of the query.",
    changed: "Lowering the lookup rate brings acquire p95 back under 50 ms. The query stays at 70 ms.",
    matters: "At 400 per second, acquire p95 is about 8 ms. At 560 it is about 80 ms, past the bar.",
    technologies: ["Acquire p95", "Query time", "Little's Law", "The 40-connection pool"],
    difficulty: "medium",
    minutes: "~45s",
    chapterHref: drillChapterMeta("tail-latency")?.chapterHref ?? "/system-design/chapter-2",
    chapterLabel: drillChapterMeta("tail-latency")?.chapterLabel ?? "Ch.2 · Requests, latency, throughput",
    takeaway: "The query stays near its baseline. Acquire p95 is the tail the pass bar measures.",
    preview: {
      primary: { label: "Acquire p95", value: "80 ms", tone: "bad" },
      secondary: { label: "Query", value: "70 ms", tone: "ok" },
      spark: [0.2, 0.22, 0.24, 0.3, 0.55, 0.8, 0.9, 0.7],
      caption: "Query flat. Acquire time climbs.",
    },
  },
];

export function getPlayGame(slug: string): PlayGame | undefined {
  return playGames.find((g) => g.slug === slug);
}

export function difficultyLabel(d: PlayDifficulty): string {
  if (d === "easy") return "Easy";
  if (d === "medium") return "Medium";
  return "Spicy";
}
