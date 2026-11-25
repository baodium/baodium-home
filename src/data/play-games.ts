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
    feel: "Recommendation Service shares a pool of 40 database connections with the home page and checkout. At about 400 lookups a second and a 70 ms hold, Little's Law puts roughly 28 connections in use, which leaves a thin margin for a burst.",
    notice: "Watch pending acquisitions and acquire wait as the arrival rate rises. The recommendation query itself stays near 70 ms, so a slower database call is not what fills the pool.",
    success: "When the burst ends, pending acquisitions are at zero and acquire wait stays under 50 ms. The pool size stays at 40.",
    learn: "Cutting exposure or turning the feature flag off stops new recommendation calls from entering the pool. Growing the pool is outside the response this incident uses.",
    changed: "Lower exposure, or a flag that is off for new traffic, drops new demand immediately. Connections already held still finish on their own clock.",
    matters: "Acquire wait near 600 ms while the query stays near baseline means the time is spent waiting for a free connection, not running SQL.",
    technologies: ["Feature flags", "Connection pools", "Little's Law", "Acquire wait"],
    difficulty: "medium",
    minutes: "~1 min",
    chapterHref: drillChapterMeta("slo-watch")?.chapterHref ?? "/system-design/chapter-1",
    chapterLabel: drillChapterMeta("slo-watch")?.chapterLabel ?? "Ch.1 · Resource contention",
    takeaway:
      "Turning the flag off for new traffic stops fresh recommendation calls. The query stays near 70 ms, and acquire wait is the line that tracked the queue for a connection.",
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
    feel: "The chapter load test walks four stages: 300, 400, 480, and 560 lookups a second. Two of those stages pass both bars. Two do not. You choose the admission limit that stops the walk.",
    notice: "Read acquire p95 and the rejection share on every stage the test reaches. A stage can show acquire p95 under 50 ms and still fail because rejections crossed 1 percent.",
    success: "The admission limit sits at 400 lookups a second. Acquire p95 stays under 50 ms and rejections stay under 1 percent on every stage the test is allowed to reach.",
    learn: "Both bars have to clear on the same stage. The admission limit belongs on the last stage that clears both, which the table marks as 400 per second.",
    changed: "Stopping the walk at 400 lookups a second keeps the run on the passing rows. A higher limit includes a stage the table already marks as failed.",
    matters: "At 480 lookups a second the chapter records about 2 percent rejected, even while acquire p95 is still about 25 ms.",
    technologies: ["Little's Law", "Load tests", "Admission limits", "Acquire p95"],
    difficulty: "easy",
    minutes: "~45s",
    chapterHref: drillChapterMeta("traffic-surge")?.chapterHref ?? "/system-design/chapter-2",
    chapterLabel: drillChapterMeta("traffic-surge")?.chapterLabel ?? "Ch.2 · Requests, latency, throughput",
    takeaway:
      "400 lookups a second is the last stage that clears both bars. That is where the admission limit belongs.",
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
    feel: "Checkout calls Fraud Service with a child deadline cut from the time it still has left, after a reserve and with a 1000 ms cap. A slow provider can still be running after checkout has already returned to the customer.",
    notice: "Watch caller time, the child deadline, and any provider work that continues after the caller returns. Those three numbers tell you whether the outbound call stopped with checkout.",
    success: "Leftover provider work is 0 ms for the full run, and checkout returns inside the time it had left.",
    learn: "Passing cancellation with the child deadline stops a provider call that already started. Refusing the outbound permit is a different branch: the call never leaves.",
    changed: "When evaluate_risk receives request.cancellation with the deadline, provider work ends when checkout is out of time. Without that signal, the provider keeps running after the caller returns.",
    matters: "A missing outbound permit defers the assessment instead of starting the provider. That is a separate path from cancelling an in-flight call.",
    technologies: ["Deadlines", "Cancellation", "Outbound permits", "Fraud provider"],
    difficulty: "spicy",
    minutes: "~1 min",
    chapterHref: drillChapterMeta("cascade")?.chapterHref ?? "/system-design/chapter-4",
    chapterLabel: drillChapterMeta("cascade")?.chapterLabel ?? "Ch.4 · Cascading failure",
    takeaway:
      "evaluate_risk receives the child deadline and request.cancellation together. With those in place, the provider stops when checkout is out of time.",
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
    feel: "product-metadata:v1 is a cache-aside entry with a 300 second TTL. While the entry is fresh, Catalog is not called. On a miss, every concurrent reader would call Catalog unless they share one loader.",
    notice: "Count catalog reads against the reader count, and watch for TemporarilyUnavailable(source_read_limit) when the source permit is missing.",
    success: "One catalog read fills the miss, and unavailable responses stay at zero for the full run.",
    learn: "singleflight.run shares one in-flight loader for the key. That loader calls source_reads.try_acquire before it reads Catalog.",
    changed: "Sharing the loader drops catalog reads from one-per-reader down to a single fetch for the miss.",
    matters: "When the source permit is missing, the loader returns TemporarilyUnavailable(source_read_limit) instead of opening another catalog query.",
    technologies: ["Cache-aside", "TTL", "Shared loader", "Source permits"],
    difficulty: "medium",
    minutes: "~50s",
    chapterHref: drillChapterMeta("cache-roulette")?.chapterHref ?? "/system-design/chapter-5",
    chapterLabel: drillChapterMeta("cache-roulette")?.chapterLabel ?? "Ch.5 · Caching",
    takeaway:
      "A fresh entry returns from cache without calling Catalog. A miss shares one loader, and that loader needs a source permit before it may read Catalog.",
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
    feel: "The recommendation query holds a connection for about 70 ms and stays at that hold time for the whole drill. What changes is how long a lookup waits to acquire a connection from the pool of 40.",
    notice: "The histogram is acquire time. Keep the query line flat at 70 ms while you move the lookup rate across the chapter's load-test stages.",
    success: "Acquire p95 stays under 50 ms for the full run at a lookup rate the load-test table marks as passing.",
    learn: "The tail this chapter measures is the wait for a connection. It is not a second copy of the query time.",
    changed: "Lowering the offered lookup rate brings acquire p95 back under 50 ms. The query stays at 70 ms either way.",
    matters: "At 400 lookups a second, acquire p95 is about 8 ms. At 560 it is about 80 ms, which is past the pass bar.",
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
