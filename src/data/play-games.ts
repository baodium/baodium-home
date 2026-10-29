/** Catalog for the /play interactive hub (reliability drills). */

import { drillChapterMeta } from "@/lib/learning/registry";

export type PlayDifficulty = "easy" | "medium" | "spicy";

export type PlayGame = {
  slug: string;
  title: string;
  /** Challenge-style one-liner for hub cards (no spoiler solution). */
  feel: string;
  /** What the meters will show when the failure is live. */
  notice: string;
  /** Explicit win condition. */
  success: string;
  /** What you learn by finishing the drill. */
  learn: string;
  /** What changed in the system when you acted. */
  changed: string;
  /** Why that change matters on a real service. */
  matters: string;
  /** Stack / concepts shown beside the scenario. */
  technologies: string[];
  difficulty: PlayDifficulty;
  minutes: string;
  chapterHref: string;
  chapterLabel: string;
  /** Compact takeaway for share/debrief fallback. */
  takeaway: string;
  /** Clear challenge question matching the drill H1. */
  challenge: string;
  /** Mini-preview seed metrics shown on the hub card. */
  preview: {
    primary: { label: string; value: string; tone: "ok" | "warn" | "bad" };
    secondary: { label: string; value: string; tone: "ok" | "warn" | "bad" };
    spark: number[]; // 0..1 heights for sparkline
    caption: string;
  };
};

export const playGames: PlayGame[] = [
  {
    slug: "slo-watch",
    title: "SLO Watch",
    challenge: "Can you hold checkout at 99.5% through three waves?",
    feel: "Three traffic waves hit checkout. You set pool size, concurrency, and retries before the error budget runs out.",
    notice:
      "Watch error budget and pool util together. Aggressive retries under saturation burn the budget twice.",
    success:
      "Budget > 0 for 48s, success ≥ 98.3%, no cascade, peak pool util < 120%.",
    learn: "Pool size and concurrency are different levers: one caps holds, the other caps admission.",
    changed:
      "Sizing the pool without capping admission still queues; capping admission without retries still fails under Wave 3.",
    matters:
      "In production, a retry storm under saturation doubles offered load and spends the same error budget twice, before anyone pages on util alone.",
    technologies: [
      "Error budgets",
      "Connection pools",
      "Concurrency limits",
      "Retry policy",
      "Load shedding",
    ],
    difficulty: "medium",
    minutes: "~1 min",
    chapterHref: drillChapterMeta("slo-watch")?.chapterHref ?? "/system-design/chapter-1",
    chapterLabel:
      drillChapterMeta("slo-watch")?.chapterLabel ?? "Ch.1 · Resource contention",
    takeaway:
      "Capacity and retries are coupled: aggressive retries under saturation spend the budget twice.",
    preview: {
      primary: { label: "Error budget", value: "18%", tone: "bad" },
      secondary: { label: "Success", value: "98.7%", tone: "warn" },
      spark: [0.35, 0.42, 0.55, 0.72, 0.88, 0.96, 0.91, 0.78],
      caption: "Wave 3 · pool 97% · retry amp 2.4×",
    },
  },
  {
    slug: "traffic-surge",
    title: "Traffic Surge",
    challenge: "Can you keep p95 under budget through the spike?",
    feel: "A spike lands around 12 seconds against fixed capacity. Admit, queue, and shed so latency survives.",
    notice: "Past the cliff, shedding cuts errors faster than any capacity you do not have.",
    success:
      "Serve ≥ 55%, under-budget ≥ 55% of the run with peak p95 < 588ms, success > 48%, VIP ≥ 72% if priority on.",
    learn: "When capacity is fixed, early shedding is the only lever that protects latency.",
    changed:
      "Dropping admit rate at the cliff keeps p95 inside budget; serving everyone slowly breaches it for everyone.",
    matters:
      "Real flash sales do not get more machines in the first 30 seconds. Protect the customers you can still serve.",
    technologies: [
      "Admission control",
      "Queue caps",
      "Load shedding",
      "p95 latency",
      "VIP priority",
    ],
    difficulty: "easy",
    minutes: "~45s",
    chapterHref:
      drillChapterMeta("traffic-surge")?.chapterHref ?? "/system-design/chapter-2",
    chapterLabel:
      drillChapterMeta("traffic-surge")?.chapterLabel ??
      "Ch.2 · Requests, latency, throughput",
    takeaway:
      "Shedding early protects the customers you can serve. Serving everyone slowly serves no one.",
    preview: {
      primary: { label: "p95", value: "840ms", tone: "bad" },
      secondary: { label: "Served", value: "61%", tone: "warn" },
      spark: [0.25, 0.28, 0.32, 0.9, 0.95, 0.7, 0.45, 0.38],
      caption: "Cliff at 12s · capacity fixed · dual admission lanes",
    },
  },
  {
    slug: "cascade",
    title: "Cascade",
    challenge: "Can you keep checkout alive when a dependency fails?",
    feel: "Auth and DB wobble on a shared pool. Keep checkout alive as dependency health drops.",
    notice: "Watch topology health, open breakers, and cascade risk together — blast radius is visible on the graph.",
    success: "Checkout ok ≥ 60%, edge health > 42%, peak cascade risk < 82%. No auth bypass.",
    learn: "A circuit without a bulkhead still shares the pool. Isolation needs both.",
    changed:
      "Fail-fast frees slots; bulkheads stop auth/DB failure from starving checkout’s shared workers.",
    matters:
      "Most total outages start as one slow dependency holding threads that every other path needs.",
    technologies: [
      "Circuit breakers",
      "Bulkheads",
      "Fail-fast timeouts",
      "Shared worker pools",
      "Dependency health",
    ],
    difficulty: "spicy",
    minutes: "~1 min",
    chapterHref: drillChapterMeta("cascade")?.chapterHref ?? "/system-design/chapter-4",
    chapterLabel:
      drillChapterMeta("cascade")?.chapterLabel ?? "Ch.4 · Cascading failure",
    takeaway:
      "Isolate failure domains first. A circuit without a bulkhead still shares the blast radius.",
    preview: {
      primary: { label: "Checkout ok", value: "41%", tone: "bad" },
      secondary: { label: "Cascade risk", value: "0.86", tone: "bad" },
      spark: [0.2, 0.35, 0.55, 0.78, 0.92, 0.88, 0.7, 0.55],
      caption: "Auth open · shared pool contagion",
    },
  },
  {
    slug: "cache-roulette",
    title: "Cache Roulette",
    challenge: "Can you survive a hot-key expiry without stampeding origin?",
    feel: "Cached keys expire on a timer. Watch origin load when the hot key's TTL fires.",
    notice: "Compare heatmap age, fill-window coalesce state, and origin load at each expiry.",
    success: "Hit rate ≥ 70%, stampede < 2.2s, peak origin load < 1.45×.",
    learn: "Without request coalescing, a TTL expiry becomes an origin stampede for the whole fill window.",
    changed: "Singleflight collapses N miss fills into one; soft TTL hides the wait from clients.",
    matters:
      "A popular key’s TTL expiry can multiply origin QPS by RPS × fill latency, enough to take down the database behind the cache.",
    technologies: [
      "TTL caches",
      "Singleflight / coalescing",
      "Soft TTL (SWR)",
      "Origin fill latency",
      "Thundering herd",
    ],
    difficulty: "medium",
    minutes: "~50s",
    chapterHref:
      drillChapterMeta("cache-roulette")?.chapterHref ?? "/system-design/chapter-5",
    chapterLabel:
      drillChapterMeta("cache-roulette")?.chapterLabel ?? "Ch.5 · Caching",
    takeaway:
      "Without request coalescing, a TTL expiry becomes an origin stampede.",
    preview: {
      primary: { label: "Origin load", value: "3.2×", tone: "bad" },
      secondary: { label: "Hit rate", value: "54%", tone: "warn" },
      spark: [0.3, 0.32, 0.95, 0.88, 0.4, 0.35, 0.9, 0.85],
      caption: "TTL fire · thundering herd on fill",
    },
  },
  {
    slug: "tail-latency",
    title: "Tail Latency",
    challenge: "Can you keep p99 below 420 ms?",
    feel: "Stragglers arrive after about 10 seconds. Hold p99 under budget without multiplying work through careless hedges.",
    notice:
      "p50 is the median; p99 is the slowest 1%. They diverge under stragglers and queueing.",
    success: "p99 ≤ 420ms, goodput ≥ 90%, work cost < 1.8×, ≥40 samples.",
    learn: "The slowest requests shape the customer experience. Hedging only helps when duplicate work still fits.",
    changed:
      "Right-sized concurrency drops queue wait; hedges cut p99 only while cost stays under ~1.8×.",
    matters:
      "An SLO on the median can pass while the slowest 1% of checkouts already time out. Track the percentile customers feel.",
    technologies: [
      "p50 / p99 latency",
      "Worker pools",
      "Request hedging",
      "Timeouts",
      "Work amplification",
    ],
    difficulty: "medium",
    minutes: "~45s",
    chapterHref:
      drillChapterMeta("tail-latency")?.chapterHref ?? "/system-design/chapter-2",
    chapterLabel:
      drillChapterMeta("tail-latency")?.chapterLabel ??
      "Ch.2 · Requests, latency, throughput",
    takeaway:
      "The slowest requests shape the customer experience. Hedging helps only when the duplicate work still fits.",
    preview: {
      primary: { label: "p99", value: "1.4s", tone: "bad" },
      secondary: { label: "p50", value: "48ms", tone: "ok" },
      spark: [0.22, 0.24, 0.26, 0.28, 0.55, 0.85, 0.92, 0.78],
      caption: "Median steady · tail climbing",
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
