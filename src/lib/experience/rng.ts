/** Mulberry32 — fast, seedable, repeatable. */

export type Rng = {
  next: () => number;
  int: (min: number, maxExclusive: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
};

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, maxExclusive) => min + Math.floor(next() * (maxExclusive - min)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)]!,
  };
}

/** Stable 0–1 hash for feature-flag bucketing (same user → same bucket). */
export function stableUnit(userId: string, salt = "recs-v1"): number {
  let h = 2166136261;
  const str = `${salt}:${userId}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function isUserExposed(userId: string, exposurePct: number, salt?: string): boolean {
  if (exposurePct <= 0) return false;
  if (exposurePct >= 100) return true;
  return stableUnit(userId, salt) * 100 < exposurePct;
}
