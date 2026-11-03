"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import { P99_BUDGET_MS, QUERY_MS } from "@/lib/play/tail-latency";

const W = 640;
const H = 228;
const PAD = { t: 18, r: 16, b: 32, l: 36 };

/** Acquire-time histogram. The query is a fixed mark, not a bar that moves. */
export function TailDistributionViz({
  samples,
  queryMs = QUERY_MS,
  p95,
  budgetMs = P99_BUDGET_MS,
}: {
  samples: number[];
  queryMs?: number;
  p95: number;
  budgetMs?: number;
}) {
  const hist = useMemo(() => {
    const maxLat = Math.max(budgetMs * 1.6, queryMs, d3.max(samples) ?? 1, p95, 1);
    const x = d3.scaleLinear().domain([0, maxLat]).range([PAD.l, W - PAD.r]);
    const bins = d3
      .bin()
      .domain([0, maxLat] as [number, number])
      .thresholds(x.ticks(24))(samples);
    const peak = Math.max(1, d3.max(bins, (b) => b.length) ?? 1);
    const y = d3.scaleLinear().domain([0, peak]).range([H - PAD.b, PAD.t]);
    return { bins, x, y, maxLat };
  }, [samples, budgetMs, queryMs, p95]);

  const hasSamples = samples.length > 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            Acquire time
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Each bar is a recent wait for a connection. The query stays at {queryMs.toFixed(0)} ms.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          n={samples.length}
        </p>
      </div>

      {hasSamples ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Acquire time histogram. Query ${queryMs.toFixed(0)} milliseconds. Acquire p95 ${p95.toFixed(0)} milliseconds. Bar ${budgetMs} milliseconds.`}
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
          <Marker x={hist.x(Math.min(hist.maxLat, queryMs))} label="query" color="var(--drill-muted)" />
          <Marker x={hist.x(Math.min(hist.maxLat, p95))} label="p95" color="var(--drill-accent)" />
          <Marker x={hist.x(Math.min(hist.maxLat, budgetMs))} label="bar" color="var(--drill-signal)" />
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
          Acquire samples collect once the run starts. The query mark stays at {queryMs.toFixed(0)} ms.
        </p>
      )}

      <div className="border-t border-[color:var(--drill-line)] px-4 py-3 text-[0.75rem] leading-relaxed text-[color:var(--drill-muted)] sm:px-5">
        Query {queryMs.toFixed(0)} ms. Acquire p95 {p95.toFixed(0)} ms. The pass bar is {budgetMs} ms.
      </div>
    </div>
  );
}

function Marker({ x, label, color }: { x: number; label: string; color: string }) {
  return (
    <g>
      <line x1={x} x2={x} y1={14} y2={H - PAD.b} stroke={color} strokeWidth={1.4} />
      <text x={x + 3} y={12} fill={color} fontSize="9" fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}
