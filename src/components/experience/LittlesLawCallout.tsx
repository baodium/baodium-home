"use client";

import { formatLittles } from "@/lib/experience/littles";
import type { EngineSnapshot } from "@/lib/experience/types";

export function LittlesLawCallout({ snap }: { snap: EngineSnapshot }) {
  const { littles } = snap;
  return (
    <div className="exp-panel">
      <h3 className="font-serif text-lg text-cream">Little&apos;s Law</h3>
      <p className="mt-2 font-mono text-sm tabular-nums text-amber">
        L = λ × W → {formatLittles(littles)}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-cream/60">
        At ~{littles.lambda.toFixed(0)} req/s with mean hold {littles.W.toFixed(3)}s, expected
        occupancy is ~{littles.L.toFixed(0)} connections.
        {littles.overDemand
          ? " Demand exceeds the 40-slot pool — waiters appear; busy slots stay capped at 40."
          : " Demand fits in the pool — waiters should stay near zero."}
      </p>
      <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-cream/40">
        Observed busy {snap.activeCount} · demand ≈ {snap.demandOccupancy.toFixed(0)} · simulated
      </p>
    </div>
  );
}
