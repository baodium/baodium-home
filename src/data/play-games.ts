/** Catalog for the /play interactive hub (reliability drills). */

export type PlayDifficulty = "easy" | "medium" | "spicy";

export type PlayGame = {
  slug: string;
  title: string;
  /** One line — what the player will feel. */
  feel: string;
  /** What to watch for while drilling — teaching cue. */
  notice: string;
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
    feel: "Burn error budget under three traffic waves — size the pool or cascade.",
    notice: "Watch occupancy and retries trade places as the budget drains.",
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
    feel: "Shape and shed load as RPS spikes — latency vs errors, live.",
    notice: "Shedding cuts errors faster than growing capacity once the cliff hits.",
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
    feel: "Trip circuits and add bulkheads before a dependency outage fans out.",
    notice: "See blast radius shrink only after both circuit and bulkhead land.",
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
    feel: "Hit, miss, stampede — feel a thundering herd vs a stampeded cache.",
    notice: "Compare a single miss refresh against a herd of identical fetches.",
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
    feel: "Watch p50 smile while p99 ruins the day — hedge carefully.",
    notice: "p50 is the median experience; p99 is the worst 1% users feel.",
    difficulty: "medium",
    minutes: "~45s",
    chapterHref: "/system-design/chapter-2",
    chapterLabel: "Ch.2 — Latency and throughput",
    takeaway:
      "Users feel the tail, not the mean — hedging helps only when the duplicate work fits.",
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
