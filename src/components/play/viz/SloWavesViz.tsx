"use client";

import { useMemo } from "react";
import * as d3 from "d3";

export type SloWavePoint = {
  t: number;
  wave: number;
  arrivals: number;
  successRate: number;
  errorBudget: number;
  poolUtil: number;
};

const WAVE_ENDS = [16, 32, 48];
const W = 640;
const H = 248;
const PAD = { t: 22, r: 18, b: 28, l: 44 };

/**
 * Three traffic waves and error-budget burn. Scales, lines, and area come from D3.
 * Fills are flat so the chart does not rely on a decorative gradient.
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
  const points = useMemo(
    () =>
      series.length > 0
        ? series
        : [{ t: 0, wave: 1, arrivals: 40, successRate: 1, errorBudget: 100, poolUtil: 0.2 }],
    [series],
  );

  const paths = useMemo(() => {
    const maxArr = Math.max(120, d3.max(points, (p) => p.arrivals) ?? 120);
    const x = d3.scaleLinear().domain([0, duration]).range([PAD.l, W - PAD.r]);
    const yArr = d3
      .scaleLinear()
      .domain([0, maxArr])
      .range([H * 0.46, PAD.t]);
    const yBudget = d3
      .scaleLinear()
      .domain([0, 100])
      .range([H - PAD.b, H * 0.52]);

    const arrival = d3
      .line<SloWavePoint>()
      .x((p) => x(p.t))
      .y((p) => yArr(p.arrivals))
      .curve(d3.curveMonotoneX);
    const budget = d3
      .line<SloWavePoint>()
      .x((p) => x(p.t))
      .y((p) => yBudget(p.errorBudget))
      .curve(d3.curveMonotoneX);
    const budgetArea = d3
      .area<SloWavePoint>()
      .x((p) => x(p.t))
      .y0(yBudget(0))
      .y1((p) => yBudget(p.errorBudget))
      .curve(d3.curveMonotoneX);

    return {
      arrival: arrival(points) ?? "",
      budget: budget(points) ?? "",
      budgetArea: budgetArea(points) ?? "",
      x,
      yArr,
      yBudget,
    };
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
            Wave {liveWave} of 3. The upper line is arrivals. The lower band is error budget still left.
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
            y={14}
            fill={liveWave === i + 1 ? "var(--drill-fg)" : "var(--drill-faint)"}
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            W{i + 1}
          </text>
        ))}
        <path d={paths.budgetArea} fill="var(--drill-accent)" fillOpacity={0.16} />
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
        <circle
          cx={paths.x(last.t)}
          cy={paths.yArr(last.arrivals)}
          r={3.5}
          fill="var(--drill-signal)"
        />
        <circle
          cx={paths.x(last.t)}
          cy={paths.yBudget(last.errorBudget)}
          r={3.5}
          fill="var(--drill-accent)"
        />
        <text x={PAD.l} y={H - 8} fill="var(--drill-faint)" fontSize="10" fontFamily="ui-monospace, monospace">
          0s
        </text>
        <text
          x={W - PAD.r}
          y={H - 8}
          textAnchor="end"
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
          <span className="inline-block h-2.5 w-4 rounded-[2px] bg-[color:var(--drill-accent)] opacity-80" aria-hidden />
          Error budget left
        </span>
      </div>
    </div>
  );
}
