"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import { P99_BUDGET_MS } from "@/lib/play/tail-latency";

const W = 640;
const H = 228;
const PAD = { t: 18, r: 16, b: 32, l: 36 };

/**
 * D3 histogram of latency samples, with p50, p99, budget, and hedge markers.
 */
export function TailDistributionViz({
  samples,
  p50,
  p99,
  cost,
  hedge,
  hedgeAfterMs,
  budgetMs = P99_BUDGET_MS,
  costCap = 1.8,
}: {
  samples: number[];
  p50: number;
  p99: number;
  cost: number;
  hedge: boolean;
  hedgeAfterMs: number;
  budgetMs?: number;
  costCap?: number;
}) {
  const hist = useMemo(() => {
    const maxLat = Math.max(budgetMs * 1.8, d3.max(samples) ?? 1, 1);
    const x = d3.scaleLinear().domain([0, maxLat]).range([PAD.l, W - PAD.r]);
    const bins = d3
      .bin()
      .domain([0, maxLat] as [number, number])
      .thresholds(x.ticks(24))(samples);
    const peak = Math.max(1, d3.max(bins, (b) => b.length) ?? 1);
    const y = d3
      .scaleLinear()
      .domain([0, peak])
      .range([H - PAD.b, PAD.t]);
    return { bins, x, y, maxLat, peak };
  }, [samples, budgetMs]);

  const hasSamples = samples.length > 1;
  const costPct = Math.min(100, (cost / costCap) * 100);
  const costTone =
    cost >= costCap
      ? "var(--drill-accent)"
      : cost >= costCap * 0.85
        ? "var(--drill-warn)"
        : "var(--drill-signal)";

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            Distribution · hedges · work cost
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Histogram of recent latencies. Bars past the budget are the tail you are trying to pull in.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          n={samples.length} · cost {cost.toFixed(2)}×
        </p>
      </div>

      {hasSamples ? (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Latency histogram with hedge and budget markers"
      >
        {hist.bins.map((bin, i) => {
          const x0 = bin.x0 ?? 0;
          const x1 = bin.x1 ?? x0;
          const over = x0 >= budgetMs;
          return (
            <rect
              key={i}
              x={hist.x(x0) + 1}
              y={hist.y(bin.length)}
              width={Math.max(1, hist.x(x1) - hist.x(x0) - 2)}
              height={Math.max(0, hist.y(0) - hist.y(bin.length))}
              fill={over ? "var(--drill-accent)" : "var(--drill-signal)"}
              fillOpacity={over ? 0.85 : 0.72}
            />
          );
        })}
        <Marker x={hist.x(Math.min(hist.maxLat, p50))} label="p50" color="var(--drill-muted)" />
        <Marker x={hist.x(Math.min(hist.maxLat, p99))} label="p99" color="var(--drill-accent)" />
        <Marker x={hist.x(Math.min(hist.maxLat, budgetMs))} label="budget" color="var(--drill-signal)" />
        {hedge ? (
          <Marker
            x={hist.x(Math.min(hist.maxLat, hedgeAfterMs))}
            label="hedge"
            color="var(--drill-warn)"
            dashed
          />
        ) : null}
        <text x={PAD.l} y={H - 8} fill="var(--drill-faint)" fontSize="10" fontFamily="ui-monospace, monospace">
          0ms
        </text>
        <text
          x={W - PAD.r}
          y={H - 8}
          textAnchor="end"
          fill="var(--drill-faint)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {hist.maxLat.toFixed(0)}ms
        </text>
      </svg>
      ) : (
        <p className="px-4 py-10 text-sm leading-relaxed text-[color:var(--drill-muted)] sm:px-5">
          The histogram fills once requests finish. p99 is only meaningful after a window of samples, so it stays blank until then.
        </p>
      )}

      <div className="border-t border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[0.72rem] text-[color:var(--drill-muted)]">
          <span>
            Work cost cap {costCap.toFixed(1)}×
            {hedge ? ` · hedge after ${hedgeAfterMs}ms` : " · hedges off"}
          </span>
          <span className="tabular-nums text-[color:var(--drill-fg)]">
            {cost.toFixed(2)}× / {costCap.toFixed(1)}×
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--drill-track)]">
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${costPct}%`, background: costTone }}
          />
        </div>
      </div>
    </div>
  );
}

function Marker({
  x,
  label,
  color,
  dashed = false,
}: {
  x: number;
  label: string;
  color: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={14}
        y2={H - PAD.b}
        stroke={color}
        strokeWidth={1.4}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      <text x={x + 3} y={12} fill={color} fontSize="9" fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}
