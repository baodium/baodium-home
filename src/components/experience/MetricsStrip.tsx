"use client";

import type { EngineSnapshot } from "@/lib/experience/types";

export function MetricsStrip({ snap }: { snap: EngineSnapshot }) {
  const points = snap.recentLatency;
  const w = 240;
  const h = 52;
  const max = Math.max(0.05, ...points.map((p) => p.totalSec));
  const path =
    points.length < 2
      ? ""
      : points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * w;
            const y = h - (p.totalSec / max) * (h - 6) - 3;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
  const area =
    path &&
    `${path} L${w},${h} L0,${h} Z`;

  return (
    <div className="exp-panel h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Latency</h3>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            Simulated · last completions
          </p>
          <dl className="mt-3 flex gap-5">
            <div>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                p50
              </dt>
              <dd className="font-mono text-sm tabular-nums text-[color:var(--exp-fg)]">
                {(snap.latencyP50 * 1000).toFixed(0)} ms
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                p99
              </dt>
              <dd className="font-mono text-sm tabular-nums text-[color:var(--exp-fg)]">
                {(snap.latencyP99 * 1000).toFixed(0)} ms
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
        </div>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-14 w-full max-w-[240px] text-[color:var(--exp-amber)]"
          aria-hidden="true"
        >
          {area ? (
            <path d={area} fill="currentColor" opacity="0.12" />
          ) : null}
          {path ? (
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          ) : (
            <text x="8" y="30" className="fill-[color:var(--exp-faint)] text-[10px]">
              Awaiting samples
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
