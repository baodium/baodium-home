"use client";

import { useId, useMemo } from "react";
import * as d3 from "d3";
import type { SeriesPoint } from "@/lib/experience/short-labs/types";

const PAD = { t: 16, r: 16, b: 28, l: 44 };

export function ShortSeriesChart({
  title,
  caption,
  yUnit,
  series,
  points,
  guide,
}: {
  title: string;
  caption: string;
  yUnit: string;
  series: { key: string; label: string; swatch: string }[];
  points: SeriesPoint[];
  guide?: { value: number; label: string };
}) {
  const gid = useId().replace(/:/g, "");
  const w = 720;
  const h = 220;

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const x = d3
      .scaleLinear()
      .domain([0, points.length - 1])
      .range([PAD.l, w - PAD.r]);
    const peak = d3.max(points, (point) => d3.max(series, (item) => point[item.key] ?? 0)) ?? 1;
    const yMax = Math.max(peak, guide?.value ?? 0, 1);
    const y = d3
      .scaleLinear()
      .domain([0, yMax * 1.08])
      .nice()
      .range([h - PAD.b, PAD.t]);
    const line = d3
      .line<SeriesPoint>()
      .x((_, index) => x(index))
      .curve(d3.curveMonotoneX);
    const paths = series.map((item) => ({
      ...item,
      d:
        line.y((point) => y(point[item.key] ?? 0))(points) ?? "",
    }));
    const ticks = y.ticks(4);
    return { paths, ticks, y, guideY: guide ? y(guide.value) : null };
  }, [points, series, guide]);

  const latest = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="exp-panel !p-0 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--exp-line)] px-4 py-3 sm:px-5">
        <div>
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">{title}</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[color:var(--exp-muted)]">{caption}</p>
        </div>
        {latest ? (
          <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--exp-fg)]">
            {series
              .map((item) => `${item.label} ${(latest[item.key] ?? 0).toFixed(item.key.endsWith("Pct") ? 0 : 1)}`)
              .join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="px-2 py-3 sm:px-3">
        {chart ? (
          <svg
            role="img"
            aria-label={title}
            viewBox={`0 0 ${w} ${h}`}
            className="h-auto w-full"
          >
            {chart.ticks.map((tick) => (
              <g key={`${gid}-${tick}`}>
                <line
                  x1={PAD.l}
                  x2={w - PAD.r}
                  y1={chart.y(tick)}
                  y2={chart.y(tick)}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <text
                  x={PAD.l - 8}
                  y={chart.y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="currentColor"
                  opacity={0.55}
                  fontSize={11}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {tick}
                </text>
              </g>
            ))}
            {chart.guideY !== null && guide ? (
              <g>
                <line
                  x1={PAD.l}
                  x2={w - PAD.r}
                  y1={chart.guideY}
                  y2={chart.guideY}
                  stroke="#ad4f36"
                  strokeDasharray="4 4"
                  strokeWidth={1.25}
                />
                <text
                  x={w - PAD.r}
                  y={chart.guideY - 6}
                  textAnchor="end"
                  fill="#ad4f36"
                  fontSize={11}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {guide.label}
                </text>
              </g>
            ) : null}
            {chart.paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill="none"
                stroke={path.swatch}
                strokeWidth={2}
              />
            ))}
          </svg>
        ) : (
          <p className="px-3 py-10 text-sm text-[color:var(--exp-muted)]">
            The chart fills as the lab runs. {yUnit} is the vertical unit.
          </p>
        )}
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-[0.75rem] text-[color:var(--exp-muted)]">
          {series.map((item) => (
            <li key={item.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-3" style={{ background: item.swatch }} />
              {item.label}
            </li>
          ))}
          <li className="font-mono text-[0.68rem] uppercase tracking-[0.12em]">{yUnit}</li>
        </ul>
      </div>
    </div>
  );
}
