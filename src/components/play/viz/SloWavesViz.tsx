"use client";

import { useId, useMemo } from "react";

export type SloWavePoint = {
  t: number;
  wave: number;
  arrivals: number;
  successRate: number;
  errorBudget: number;
  poolUtil: number;
};

const WAVE_ENDS = [16, 32, 48];
const W = 560;
const H = 200;
const PAD = { t: 18, r: 16, b: 28, l: 40 };

/**
 * Three traffic waves + error-budget burn over the shift.
 */
export function SloWavesViz({
  series,
  duration = 48,
  liveWave = 1,
}: {
  series: SloWavePoint[];
  duration?: number;
  liveWave?: number;
}) {
  const gid = useId();
  const points = series.length > 0 ? series : [{ t: 0, wave: 1, arrivals: 40, successRate: 1, errorBudget: 100, poolUtil: 0.2 }];

  const paths = useMemo(() => {
    const maxArr = Math.max(120, ...points.map((p) => p.arrivals));
    const x = (t: number) => PAD.l + (t / duration) * (W - PAD.l - PAD.r);
    const yArr = (v: number) => PAD.t + (1 - v / maxArr) * (H - PAD.t - PAD.b - 48);
    const yBudget = (v: number) => PAD.t + 48 + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - PAD.t - PAD.b - 48);

    const arrival = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${yArr(p.arrivals).toFixed(1)}`)
      .join(" ");
    const budget = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${yBudget(p.errorBudget).toFixed(1)}`)
      .join(" ");
    const budgetArea =
      `M${x(points[0]!.t).toFixed(1)},${(H - PAD.b).toFixed(1)} ` +
      points.map((p) => `L${x(p.t).toFixed(1)},${yBudget(p.errorBudget).toFixed(1)}`).join(" ") +
      ` L${x(points[points.length - 1]!.t).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`;

    return { arrival, budget, budgetArea, x, maxArr };
  }, [points, duration]);

  const last = points[points.length - 1]!;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
            Waves · budget burn
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Wave {liveWave} of 3 · arrivals vs remaining error budget
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          Budget {last.errorBudget.toFixed(0)}% · util {(last.poolUtil * 100).toFixed(0)}%
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Traffic waves and error budget burn over time"
      >
        <defs>
          <linearGradient id={`${gid}-burn`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--drill-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--drill-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {WAVE_ENDS.slice(0, 2).map((end) => (
          <line
            key={end}
            x1={paths.x(end)}
            x2={paths.x(end)}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="var(--drill-line-strong)"
            strokeDasharray="3 4"
          />
        ))}
        {WAVE_ENDS.map((end, i) => (
          <text
            key={`w${end}`}
            x={paths.x(end - 8)}
            y={PAD.t - 4}
            fill={liveWave === i + 1 ? "var(--drill-fg)" : "var(--drill-faint)"}
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            W{i + 1}
          </text>
        ))}
        <path d={paths.budgetArea} fill={`url(#${gid}-burn)`} />
        <path
          d={paths.budget}
          fill="none"
          stroke="var(--drill-accent)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d={paths.arrival}
          fill="none"
          stroke="var(--drill-signal)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x={PAD.l} y={H - 8} fill="var(--drill-faint)" fontSize="10" fontFamily="ui-monospace, monospace">
          0s
        </text>
        <text
          x={W - PAD.r - 18}
          y={H - 8}
          fill="var(--drill-faint)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {duration}s
        </text>
      </svg>
      <div className="flex flex-wrap gap-4 border-t border-[color:var(--drill-line)] px-4 py-2.5 text-[0.72rem] text-[color:var(--drill-muted)] sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[color:var(--drill-signal)]" aria-hidden />
          Arrivals
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[color:var(--drill-accent)]" aria-hidden />
          Error budget left
        </span>
      </div>
    </div>
  );
}
