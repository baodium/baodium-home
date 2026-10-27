"use client";

import { formatLittles } from "@/lib/experience/littles";
import type { EngineSnapshot } from "@/lib/experience/types";

export function LittlesLawCallout({ snap }: { snap: EngineSnapshot }) {
  const { littles } = snap;
  const demandPct = Math.min(160, (littles.demand / snap.poolSize) * 100);
  const over = littles.overDemand;

  return (
    <div className="exp-panel h-full">
      <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Little&apos;s Law</h3>
      <p className="mt-2 font-mono text-sm tabular-nums text-[color:var(--exp-amber)]">
        L = λ × W → {formatLittles(littles)}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        At ~{littles.lambda.toFixed(0)} req/s with mean hold {littles.W.toFixed(3)}s, expected
        occupancy is ~{littles.L.toFixed(0)} connections.
        {over
          ? " Demand exceeds the 40-slot pool — waiters appear; busy slots stay capped at 40."
          : " Demand fits in the pool — waiters should stay near zero."}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--exp-faint)]">
          <span>Demand vs pool</span>
          <span>
            ≈{snap.demandOccupancy.toFixed(0)} / {snap.poolSize}
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-[color:var(--exp-slot-free)]">
          <div
            className={`exp-demand-fill absolute inset-y-0 left-0 rounded-full ${
              over ? "bg-[color:var(--exp-accent)]" : "bg-[color:var(--exp-slot-base)]"
            }`}
            style={{ width: `${Math.min(100, demandPct)}%` }}
          />
          {/* Cap marker at 40 / 160 max scale ≈ 62.5% when demandPct uses 160 max */}
          <div
            className="absolute inset-y-0 w-px bg-[color:var(--exp-fg)]"
            style={{ left: `${(100 / 1.6)}%` }}
            title="Pool capacity (40)"
          />
        </div>
        <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          Observed busy {snap.activeCount} · demand ≈ {snap.demandOccupancy.toFixed(0)} · simulated
        </p>
      </div>
    </div>
  );
}
