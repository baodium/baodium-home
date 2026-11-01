"use client";

import { useMemo } from "react";
import * as d3 from "d3";

const W = 640;
const H = 200;
const PAD = { t: 16, r: 18, b: 28, l: 78 };

/**
 * D3 bars for the two admission lanes against a fixed queue cap.
 */
export function AdmissionQueueViz({
  vipQueue,
  restQueue,
  queueCap,
  vipFirst,
  admit,
  p95,
  p95Limit,
  arrivals,
}: {
  vipQueue: number;
  restQueue: number;
  queueCap: number;
  vipFirst: boolean;
  admit: number;
  p95: number;
  p95Limit: number;
  arrivals: number;
}) {
  const chart = useMemo(() => {
    const rows = [
      { key: "vip", label: "VIP", value: vipQueue, fill: "var(--drill-signal)" },
      { key: "regular", label: "Regular", value: restQueue, fill: "var(--drill-accent)" },
    ];
    const max = Math.max(queueCap, vipQueue, restQueue, 1) * 1.08;
    const x = d3.scaleLinear().domain([0, max]).range([PAD.l, W - PAD.r]);
    const y = d3
      .scaleBand()
      .domain(rows.map((row) => row.key))
      .range([PAD.t, H - PAD.b])
      .padding(0.38);
    return { rows, x, y, capX: x(queueCap) };
  }, [vipQueue, restQueue, queueCap]);

  const shedHint = admit < 0.95;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            Admission queue
          </p>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--drill-muted)]">
            VIP and regular wait in separate lanes. The mark is the queue cap
            {vipFirst ? ", and VIP drains first." : "."} Admit is {(admit * 100).toFixed(0)}%.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          p95 {p95.toFixed(0)}ms / {p95Limit}ms · λ {arrivals.toFixed(0)}/s
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Admission queues. VIP depth ${Math.round(vipQueue)}, regular depth ${Math.round(restQueue)}, cap ${queueCap}.`}
      >
        <line
          x1={chart.capX}
          x2={chart.capX}
          y1={PAD.t}
          y2={H - PAD.b}
          stroke="var(--drill-fg)"
          strokeDasharray="3 3"
          strokeWidth={1.2}
        />
        <text
          x={chart.capX}
          y={12}
          textAnchor="middle"
          fill="var(--drill-faint)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          cap {queueCap}
        </text>
        {chart.rows.map((row) => {
          const y = chart.y(row.key) ?? 0;
          const h = chart.y.bandwidth();
          return (
            <g key={row.key}>
              <text
                x={PAD.l - 10}
                y={y + h / 2 + 4}
                textAnchor="end"
                fill="var(--drill-fg)"
                fontSize="12"
              >
                {row.label}
              </text>
              <rect
                x={PAD.l}
                y={y}
                width={Math.max(0, chart.x(row.value) - PAD.l)}
                height={h}
                rx={3}
                fill={row.fill}
                fillOpacity={0.82}
              />
              <text
                x={Math.max(PAD.l + 8, chart.x(row.value) + 6)}
                y={y + h / 2 + 4}
                fill="var(--drill-muted)"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {Math.round(row.value)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="border-t border-[color:var(--drill-line)] px-4 py-3 text-[0.75rem] leading-relaxed text-[color:var(--drill-muted)] sm:px-5">
        Depth {Math.round(vipQueue + restQueue)} of {queueCap}.
        {shedHint
          ? " Shedding is on, so regular arrivals are the ones turned away first."
          : " Everyone who arrives is still being admitted."}
      </div>
    </div>
  );
}
