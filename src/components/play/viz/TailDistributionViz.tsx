"use client";

import { useId, useMemo } from "react";
import { P99_BUDGET_MS } from "@/lib/play/tail-latency";

/**
 * Latency distribution + hedge markers + work-cost cap line.
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
  const gid = useId();
  const W = 560;
  const H = 190;
  const PAD = { t: 16, r: 18, b: 30, l: 36 };

  const hist = useMemo(() => {
    const maxLat = Math.max(budgetMs * 1.8, ...samples, 1);
    const bins = 24;
    const counts = Array.from({ length: bins }, () => 0);
    for (const s of samples) {
      const idx = Math.min(bins - 1, Math.floor((s / maxLat) * bins));
      counts[idx]! += 1;
    }
    const peak = Math.max(1, ...counts);
    const barW = (W - PAD.l - PAD.r) / bins;
    const bars = counts.map((c, i) => {
      const h = (c / peak) * (H - PAD.t - PAD.b);
      return {
        x: PAD.l + i * barW + 1,
        y: H - PAD.b - h,
        w: Math.max(1, barW - 2),
        h,
        mid: ((i + 0.5) / bins) * maxLat,
      };
    });
    const xOf = (ms: number) => PAD.l + (Math.min(maxLat, ms) / maxLat) * (W - PAD.l - PAD.r);
    return { bars, xOf, maxLat };
  }, [samples, budgetMs]);

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
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
            Distribution · hedges · work cost
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Latency histogram with p50 / p99 / budget markers
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          n={samples.length} · cost {cost.toFixed(2)}×
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Latency distribution with hedge and budget markers"
      >
        <defs>
          <linearGradient id={`${gid}-bar`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--drill-signal)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--drill-signal)" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {hist.bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill={`url(#${gid}-bar)`}
            rx={1.5}
          />
        ))}
        <Marker x={hist.xOf(p50)} label="p50" color="var(--drill-muted)" />
        <Marker x={hist.xOf(p99)} label="p99" color="var(--drill-accent)" />
        <Marker x={hist.xOf(budgetMs)} label="budget" color="var(--drill-signal)" />
        {hedge ? (
          <Marker
            x={hist.xOf(hedgeAfterMs)}
            label="hedge"
            color="var(--drill-warn)"
            dashed
          />
        ) : null}
        <text
          x={PAD.l}
          y={H - 8}
          fill="var(--drill-faint)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          0ms
        </text>
        <text
          x={W - PAD.r - 36}
          y={H - 8}
          fill="var(--drill-faint)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {hist.maxLat.toFixed(0)}ms
        </text>
      </svg>

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
        y1={12}
        y2={160}
        stroke={color}
        strokeWidth={1.4}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      <text
        x={x + 3}
        y={22}
        fill={color}
        fontSize="9"
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}
