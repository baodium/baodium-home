"use client";

import { motion } from "motion/react";
import { formatLittles } from "@/lib/experience/littles";
import { readChapter1 } from "@/lib/experience/readout";
import type { EngineSnapshot } from "@/lib/experience/types";

export function LittlesLawCallout({
  snap,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  reducedMotion?: boolean;
}) {
  const read = readChapter1(snap);
  const { littles } = snap;
  const demandPct = Math.min(160, (read.demand / read.poolSize) * 100);
  const over = littles.overDemand;
  const capPct = 100 / 1.6;

  return (
    <div className="exp-panel h-full">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Little&apos;s Law</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          L = λ × W
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 font-mono text-[color:var(--exp-amber-text)]">
        <Term
          label="λ"
          value={read.admittedPoolRps.toFixed(0)}
          unit="/s"
          reducedMotion={reducedMotion}
        />
        <span className="pb-1 text-[color:var(--exp-faint)]">×</span>
        <Term
          label="W"
          value={(littles.W * 1000).toFixed(0)}
          unit="ms"
          reducedMotion={reducedMotion}
        />
        <span className="pb-1 text-[color:var(--exp-faint)]">≈</span>
        <Term
          label="L"
          value={read.demand.toFixed(0)}
          unit="slots"
          emphasize={over}
          reducedMotion={reducedMotion}
        />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        At ~{read.admittedPoolRps.toFixed(0)} pool acquires/s with mean hold {littles.W.toFixed(3)}s, expected
        occupancy is ~{read.demand.toFixed(0)} connections ({formatLittles(littles)}).
        {over
          ? " Demand exceeds the 40-slot pool. waiters appear; busy slots stay capped at 40."
          : " Demand fits in the pool. waiters should stay near zero."}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--exp-faint)]">
          <span>Demand vs pool</span>
          <span>
            ≈{read.demand.toFixed(0)} / {read.poolSize}
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-[color:var(--exp-slot-free)]">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${
              over ? "bg-[color:var(--exp-accent)]" : "bg-[color:var(--exp-slot-base)]"
            }`}
            initial={false}
            animate={{ width: `${Math.min(100, demandPct)}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
          <div
            className="absolute inset-y-0 w-px bg-[color:var(--exp-fg)]"
            style={{ left: `${capPct}%` }}
            title="Pool capacity (40)"
          />
          <span
            className="pointer-events-none absolute -top-5 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[color:var(--exp-faint)]"
            style={{ left: `${capPct}%`, transform: "translateX(-50%)" }}
          >
            cap 40
          </span>
        </div>
        <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          Observed busy {read.busy} · demand ≈ {read.demand.toFixed(0)} · simulated
        </p>
        {over ? (
          <p className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--exp-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--exp-accent)_10%,var(--exp-panel-raise))] px-3 py-2 text-sm leading-relaxed text-[color:var(--exp-fg)]">
            Teaching point: λ×W can exceed 40. Active connections cannot. The surplus is waiting, not a fake 41st busy slot.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Term({
  label,
  value,
  unit,
  emphasize,
  reducedMotion,
}: {
  label: string;
  value: string;
  unit: string;
  emphasize?: boolean;
  reducedMotion?: boolean;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0.45, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.28 }}
      className="rounded-lg border border-[color:var(--exp-line)] bg-[color:var(--exp-chip)] px-2.5 py-1.5"
    >
      <p className="text-[0.68rem] uppercase tracking-[0.1em] text-[color:var(--exp-faint)]">
        {label}
      </p>
      <p
        className={`text-base tabular-nums ${
          emphasize ? "text-[color:var(--exp-accent-text)]" : "text-[color:var(--exp-fg)]"
        }`}
      >
        {value}
        <span className="ml-1 text-[0.65rem] text-[color:var(--exp-faint)]">{unit}</span>
      </p>
    </motion.div>
  );
}
