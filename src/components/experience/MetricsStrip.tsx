"use client";

import type { EngineSnapshot } from "@/lib/experience/types";
import { readChapter1 } from "@/lib/experience/readout";
import { MetricValue } from "@/components/ui/MetricValue";

export function MetricsStrip({
  snap,
}: {
  snap: EngineSnapshot;
  reducedMotion?: boolean;
}) {
  const read = readChapter1(snap);
  const p50ms = read.p50Sec * 1000;
  const p99ms = read.p99Sec * 1000;
  const spread = Math.max(0, p99ms - p50ms);
  const tailHot = spread > 40 && snap.completedCount > 8;

  return (
    <div className="exp-panel h-full">
      <h3 className="font-serif text-lg tracking-[-0.02em] text-[color:var(--exp-fg)]">Latency</h3>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Read these next to the chart. p50 is the median completion. p99 is the slowest 1%.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="instrument">
          <dt className="instrument-label">p50</dt>
          <dd className="mt-2 text-[color:var(--exp-fg)]">
            <MetricValue value={p50ms} unit="ms" />
          </dd>
        </div>
        <div className="instrument" data-hot={tailHot ? "true" : undefined}>
          <dt className="instrument-label">p99</dt>
          <dd className={tailHot ? "mt-2 text-[color:var(--exp-accent-text)]" : "mt-2 text-[color:var(--exp-fg)]"}>
            <MetricValue value={p99ms} unit="ms" />
          </dd>
        </div>
        <div className="instrument">
          <dt className="instrument-label">Spread</dt>
          <dd className="mt-2 text-[color:var(--exp-fg)]">
            <MetricValue value={spread} unit="ms" />
          </dd>
        </div>
        <div className="instrument">
          <dt className="instrument-label">Done</dt>
          <dd className="mt-2 text-[color:var(--exp-fg)]">
            <MetricValue value={snap.completedCount} />
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
