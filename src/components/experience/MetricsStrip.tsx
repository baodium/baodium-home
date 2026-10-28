"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import type { EngineSnapshot } from "@/lib/experience/types";

export function MetricsStrip({
  snap,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  reducedMotion?: boolean;
}) {
  const points = snap.recentLatency;
  const w = 280;
  const h = 72;
  const pad = { t: 8, r: 8, b: 14, l: 8 };

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((_, i) => i);
    const totals = points.map((p) => p.totalSec * 1000);
    const waits = points.map((p) => p.waitSec * 1000);
    const maxY = Math.max(40, d3.max(totals) ?? 40);

    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([pad.l, w - pad.r]);
    const y = d3
      .scaleLinear()
      .domain([0, maxY])
      .range([h - pad.b, pad.t]);

    const line = d3
      .line<number>()
      .x((_, i) => x(i))
      .y((v) => y(v))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const area = d3
      .area<number>()
      .x((_, i) => x(i))
      .y0(y(0))
      .y1((v) => y(v))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const p50 = d3.quantileSorted([...totals].sort(d3.ascending), 0.5) ?? snap.latencyP50 * 1000;
    const p99 = d3.quantileSorted([...totals].sort(d3.ascending), 0.99) ?? snap.latencyP99 * 1000;
    const meanWait = d3.mean(waits) ?? 0;

    return {
      totalPath: line(totals) ?? "",
      waitPath: line(waits) ?? "",
      areaPath: area(totals) ?? "",
      p50Y: y(p50),
      p99Y: y(p99),
      p50,
      p99,
      meanWait,
      lastX: x(xs[xs.length - 1] ?? 0),
      lastY: y(totals[totals.length - 1] ?? 0),
    };
  }, [points, snap.latencyP50, snap.latencyP99, pad.b, pad.l, pad.r, pad.t]);

  const p50ms = snap.latencyP50 * 1000;
  const p99ms = snap.latencyP99 * 1000;
  const spread = Math.max(0, p99ms - p50ms);
  const tailHot = spread > 40 && snap.completedCount > 8;

  return (
    <div className="exp-panel h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Latency</h3>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            Simulated · last completions
          </p>
          <dl className="mt-3 flex flex-wrap gap-5">
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
        </div>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[4.5rem] w-full max-w-[280px]"
          role="img"
          aria-label={`Latency sparkline. p50 ${p50ms.toFixed(0)} milliseconds, p99 ${p99ms.toFixed(0)} milliseconds.`}
        >
          <defs>
            <linearGradient id="exp-lat-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2f7a7e" stopOpacity="0.28" />
              <stop offset="1" stopColor="#2f7a7e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart ? (
            <>
              <path d={chart.areaPath} fill="url(#exp-lat-fill)" />
              <path
                d={chart.waitPath}
                fill="none"
                stroke="#94a8c4"
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity={0.9}
              />
              <path
                d={chart.totalPath}
                fill="none"
                stroke="#2f7a7e"
                strokeWidth="2"
                strokeLinecap="round"
                className={!reducedMotion ? "exp-lat-draw" : undefined}
              />
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={chart.p50Y}
                y2={chart.p50Y}
                stroke="rgba(26,35,48,0.28)"
                strokeDasharray="3 4"
              />
              <circle
                cx={chart.lastX}
                cy={chart.lastY}
                r={3.2}
                fill="#ffffff"
                stroke="#ad4f36"
                strokeWidth={1.6}
              />
            </>
          ) : (
            <text x="12" y="40" className="fill-[color:var(--exp-faint)] text-[11px]">
              Awaiting samples
            </text>
          )}
        </svg>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[color:var(--exp-muted)]">
        {tailHot ? (
          <>
            The median is still calm while p99 stretches. Acquire wait on the recommendations path
            hits a minority hardest. Slate = wait; teal = total. Pair with Ops{" "}
            <span className="font-mono">acquire.wait.p99</span>.
          </>
        ) : (
          <>
            <span className="font-medium text-[color:var(--exp-fg)]">p50</span> is the median
            completion; <span className="font-medium text-[color:var(--exp-fg)]">p99</span> is the
            slowest 1%. Under contention, the spread opens first, then{" "}
            <span className="font-mono">pool.pending</span> shows on the grid.
          </>
        )}
      </p>
    </div>
  );
}
