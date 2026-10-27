/** Catalog for the /play interactive hub (reliability drills). */

export type PlayDifficulty = "easy" | "medium" | "spicy";

export type PlayGame = {
  slug: string;
  title: string;
  /** One line — what the drill asks you to do. */
  feel: string;
  /** What to watch for while drilling — teaching cue. */
  notice: string;
  /** Explicit win condition shown on the hub and in-drill. */
  success: string;
  difficulty: PlayDifficulty;
  minutes: string;
  chapterHref: string;
  chapterLabel: string;
  takeaway: string;
};

export const playGames: PlayGame[] = [
  {
    slug: "slo-watch",
    title: "SLO Watch",
    feel: "Three traffic waves hit checkout. Size the pool, cap concurrency, and choose retries before the error budget runs out.",
    notice: "Occupancy and retries trade places as the budget drains — aggressive retries under saturation spend it twice.",
    success: "Hold success rate at the SLO for the full shift without cascading.",
    difficulty: "medium",
    minutes: "~1 min",
    chapterHref: "/system-design/chapter-1",
    chapterLabel: "Ch.1 — Resource contention",
    takeaway:
      "Capacity and retries are coupled: aggressive retries under saturation spend the budget twice.",
  },
  {
    slug: "traffic-surge",
    title: "Traffic Surge",
    feel: "A spike lands around 12s. Admit, queue, and shed so p95 stays inside the budget without starving the floor.",
    notice: "Once the cliff hits, shedding cuts errors faster than growing capacity.",
    success: "Keep p95 under budget for the full run while still serving most traffic.",
    difficulty: "easy",
    minutes: "~45s",
    chapterHref: "/system-design/chapter-2",
    chapterLabel: "Ch.2 — Latency and throughput",
    takeaway:
      "Shedding early protects the customers you can serve; serving everyone slowly serves no one.",
  },
  {
    slug: "cascade",
    title: "Cascade",
    feel: "Auth and DB will wobble. Trip circuits and add bulkheads before one dependency takes checkout down with it.",
    notice: "Blast radius shrinks only after both the circuit and the bulkhead land.",
    success: "Keep checkout alive through the wobble without a site-wide outage.",
    difficulty: "spicy",
    minutes: "~1 min",
    chapterHref: "/system-design/chapter-4",
    chapterLabel: "Ch.4 — Cascading failure",
    takeaway:
      "Isolate failure domains first — a circuit without a bulkhead still shares the blast radius.",
  },
  {
    slug: "cache-roulette",
    title: "Cache Roulette",
    feel: "Cached keys expire on a timer. Coalesce concurrent misses — or watch every client hit origin at once.",
    notice: "Compare one miss refresh (singleflight) with a herd of identical origin fetches.",
    success: "Hold hit rate high and keep origin load under capacity for the full run.",
    difficulty: "medium",
    minutes: "~50s",
    chapterHref: "/system-design/chapter-5",
    chapterLabel: "Ch.5 — Caching",
    takeaway:
      "Without request coalescing, a TTL expiry becomes an origin stampede.",
  },
  {
    slug: "tail-latency",
    title: "Tail Latency",
    feel: "Stragglers arrive after ~10s. Hold p99 under budget without drowning the fleet in hedge copies.",
    notice: "p50 is the median request; p99 is the slowest 1% — they diverge under stragglers.",
    success: "Keep p99 inside the budget for the full run without work cost running away.",
    difficulty: "medium",
    minutes: "~45s",
    chapterHref: "/system-design/chapter-2",
    chapterLabel: "Ch.2 — Latency and throughput",
    takeaway:
      "Users notice the tail, not the mean — hedging helps only when the duplicate work fits.",
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
