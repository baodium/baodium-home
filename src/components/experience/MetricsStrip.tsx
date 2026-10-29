"use client";

import type { EngineSnapshot } from "@/lib/experience/types";

export function MetricsStrip({
  snap,
}: {
  snap: EngineSnapshot;
  reducedMotion?: boolean;
}) {
  const p50ms = snap.latencyP50 * 1000;
  const p99ms = snap.latencyP99 * 1000;
  const spread = Math.max(0, p99ms - p50ms);
  const tailHot = spread > 40 && snap.completedCount > 8;

  return (
    <div className="exp-panel h-full">
      <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Latency</h3>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Read these next to the chart. p50 is the median completion. p99 is the slowest 1%.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            p50
          </dt>
          <dd className="font-mono text-sm tabular-nums text-[color:var(--exp-fg)]">
            {p50ms.toFixed(0)} ms
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            p99
          </dt>
          <dd
            className={`font-mono text-sm tabular-nums ${
              tailHot ? "text-[color:var(--exp-accent)]" : "text-[color:var(--exp-fg)]"
            }`}
          >
            {p99ms.toFixed(0)} ms
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            Spread
          </dt>
          <dd className="font-mono text-sm tabular-nums text-[color:var(--exp-fg)]">
            {spread.toFixed(0)} ms
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            Done
          </dt>
          <dd className="font-mono text-sm tabular-nums text-[color:var(--exp-fg)]">
            {snap.completedCount}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-[color:var(--exp-muted)]">
        {tailHot
          ? "The median can stay calm while p99 stretches. That stretch is usually acquire wait on the recommendations path, which the chart shows as its own band."
          : "Under contention the spread opens before the pool grid fills. Pair p99 with pool.pending."}
      </p>
    </div>
  );
}
