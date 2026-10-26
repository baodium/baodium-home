import type { LittlesSnapshot } from "@/lib/experience/types";

/**
 * Little's Law: L = λ × W
 * For connection-pool teaching: expected busy slots ≈ arrival_rate × mean_hold_time.
 * When L > poolSize, the surplus shows up as waiters — not extra busy slots.
 */
export function littlesLaw(
  lambda: number,
  meanHoldSec: number,
  poolSize: number,
): LittlesSnapshot {
  const L = lambda * meanHoldSec;
  return {
    lambda,
    W: meanHoldSec,
    L,
    demand: L,
    poolSize,
    overDemand: L > poolSize + 0.05,
  };
}

export function formatLittles(s: LittlesSnapshot): string {
  const lam = s.lambda.toFixed(0);
  const w = s.W.toFixed(3);
  const l = s.L.toFixed(0);
  return `${lam} × ${w}s ≈ ${l}`;
}
