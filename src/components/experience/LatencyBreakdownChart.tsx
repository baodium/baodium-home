"use client";

import { useId, useMemo } from "react";
import * as d3 from "d3";
import type { EngineSnapshot, LatencySample } from "@/lib/experience/types";

type Row = { caller: number; wait: number; hold: number };

const PAD = { t: 16, r: 16, b: 28, l: 40 };

const SERIES = [
  { key: "caller" as const, label: "Caller time", swatch: "#5b6778" },
  { key: "wait" as const, label: "Acquire wait", swatch: "#ad4f36" },
  { key: "hold" as const, label: "Database hold", swatch: "#2f7a7e" },
];

function rowOf(sample: LatencySample): Row {
  const total = sample.totalSec * 1000;
  const wait = Math.max(0, sample.waitSec * 1000);
  const hold = Math.max(0, sample.holdSec * 1000);
  const caller = Math.max(0, total - wait - hold);
  return { caller, wait, hold };
}

/**
 * Stacked area of the three times that make one completion:
 * Product Page caller time, pool acquire wait, and database hold.
 */
export function LatencyBreakdownChart({ snap }: { snap: EngineSnapshot }) {
  const gid = useId().replace(/:/g, "");
  const w = 720;
  const h = 232;
  const samples = snap.recentLatency;

  const chart = useMemo(() => {
    if (samples.length < 2) return null;
    const rows = samples.map(rowOf);
    const stacked = d3.stack<Row>().keys(["caller", "wait", "hold"])(rows);
    const x = d3
      .scaleLinear()
      .domain([0, rows.length - 1])
      .range([PAD.l, w - PAD.r]);
    const yMax = Math.max(40, d3.max(stacked, (layer) => d3.max(layer, (d) => d[1])) ?? 40);
    const y = d3
      .scaleLinear()
      .domain([0, yMax * 1.05])
      .nice()
      .range([h - PAD.b, PAD.t]);
    const area = d3
      .area<d3.SeriesPoint<Row>>()
      .x((_, i) => x(i))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);
    const layers = stacked.map((layer) => ({
      key: layer.key,
      d: area(layer) ?? "",
    }));
    const ticks = y.ticks(4);
    return { layers, ticks, y };
  }, [samples]);

  const last = samples.length > 0 ? rowOf(samples[samples.length - 1]!) : null;

  return (
    <div className="exp-panel !p-0 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--exp-line)] px-4 py-3 sm:px-5">
        <div>
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Where the time goes</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
            Each completion splits into caller time on Product Page, acquire wait at the shared
            pool, and the database hold. The pool wait is not time spent inside Product Page.
          </p>
        </div>
        {last ? (
          <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--exp-fg)]">
            Latest {Math.round(last.caller + last.wait + last.hold)} ms
          </p>
        ) : null}
      </div>

      {chart ? (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-auto w-full"
          role="img"
          aria-label="Stacked latency chart of caller time, acquire wait, and database hold."
        >
          {chart.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.l}
                x2={w - PAD.r}
                y1={chart.y(tick)}
                y2={chart.y(tick)}
                stroke="var(--exp-line)"
              />
              <text
                x={PAD.l - 6}
                y={chart.y(tick) + 3}
                textAnchor="end"
                fill="var(--exp-faint)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}
          {chart.layers.map((layer) => {
            const series = SERIES.find((s) => s.key === layer.key);
            return (
              <path
                key={layer.key}
                d={layer.d}
                fill={series?.swatch ?? "#8a97a8"}
                fillOpacity={layer.key === "caller" ? 0.55 : 0.8}
              />
            );
          })}
          <text
            x={PAD.l}
            y={h - 8}
            fill="var(--exp-faint)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            older
          </text>
          <text
            x={w - PAD.r}
            y={h - 8}
            textAnchor="end"
            fill="var(--exp-faint)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            latest
          </text>
        </svg>
      ) : (
        <p className="px-4 py-8 text-sm leading-relaxed text-[color:var(--exp-muted)] sm:px-5">
          Completions will stack here once requests finish. You will see caller time, acquire
          wait, and database hold as three bands.
        </p>
      )}

      <div className="flex flex-wrap gap-4 border-t border-[color:var(--exp-line)] px-4 py-2.5 text-[0.75rem] text-[color:var(--exp-muted)] sm:px-5">
        {SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-[2px]"
              style={{ background: series.swatch }}
            />
            {series.label}
            {last ? (
              <span className="tabular-nums text-[color:var(--exp-fg)]">
                {Math.round(last[series.key])} ms
              </span>
            ) : null}
          </span>
        ))}
        <span className="sr-only" id={`${gid}-note`}>
          Milliseconds on the vertical axis.
        </span>
      </div>
    </div>
  );
}
