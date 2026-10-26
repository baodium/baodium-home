"use client";

import type { EngineSnapshot } from "@/lib/experience/types";

export function MetricsStrip({ snap }: { snap: EngineSnapshot }) {
  const points = snap.recentLatency;
  const w = 240;
  const h = 48;
  const max = Math.max(0.05, ...points.map((p) => p.totalSec));
  const path =
    points.length < 2
      ? ""
      : points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * w;
            const y = h - (p.totalSec / max) * (h - 4) - 2;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg text-cream">Latency</h3>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-cream/40">
            Simulated · last completions
          </p>
          <dl className="mt-3 flex gap-5">
            <div>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-cream/40">
                p50
              </dt>
              <dd className="font-mono text-sm tabular-nums text-cream">
                {(snap.latencyP50 * 1000).toFixed(0)} ms
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-cream/40">
                p99
              </dt>
              <dd className="font-mono text-sm tabular-nums text-cream">
                {(snap.latencyP99 * 1000).toFixed(0)} ms
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-cream/40">
                Done
              </dt>
              <dd className="font-mono text-sm tabular-nums text-cream">
                {snap.completedCount}
              </dd>
            </div>
          </dl>
        </div>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-12 w-full max-w-[240px] text-amber"
          aria-hidden="true"
        >
          {path ? (
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
          ) : (
            <text x="8" y="28" className="fill-cream/30 text-[10px]">
              Awaiting samples
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
