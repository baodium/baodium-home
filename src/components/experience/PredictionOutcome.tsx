"use client";

import { motion } from "motion/react";
import type { EngineSnapshot } from "@/lib/experience/types";

/**
 * After the learner commits a capacity prediction, show the measured λ×W vs pool.
 */
export function PredictionOutcome({
  snap,
  answered,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  answered: boolean;
  reducedMotion?: boolean;
}) {
  if (!answered) return null;
  const { littles } = snap;
  const under = !littles.overDemand;
  const demand = littles.L;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${
        under
          ? "border-[color-mix(in_srgb,#3d6b4f_35%,transparent)] bg-[color-mix(in_srgb,#3d6b4f_8%,transparent)]"
          : "border-[color-mix(in_srgb,var(--exp-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--exp-accent)_8%,transparent)]"
      }`}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
        Measured vs your prediction
      </p>
      <p className="mt-1.5 text-[color:var(--exp-fg)]">
        λ ≈ {littles.lambda.toFixed(0)}/s · W ≈ {(littles.W * 1000).toFixed(0)} ms → L ≈{" "}
        <span className="font-mono tabular-nums">{demand.toFixed(0)}</span> vs pool{" "}
        {littles.poolSize}.{" "}
        {under
          ? "Demand fits — waiters should stay near zero at this mix."
          : "Demand exceeds capacity — expect pool.pending > 0; busy stays capped at 40."}
      </p>
      <p className="mt-1.5 text-xs text-[color:var(--exp-muted)]">
        Formula check: ceil(λ × W × 1.25) ≈ {Math.ceil(demand * 1.25)} would be a first pool-floor
        estimate with headroom — not a license to grow W without watching acquire.wait.p99.
      </p>
    </motion.div>
  );
}
