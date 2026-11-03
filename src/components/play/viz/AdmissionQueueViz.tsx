"use client";

import { stageStats } from "@/lib/play/traffic-surge";

const STAGES = [300, 400, 480, 560] as const;
const W = 640;
const H = 220;
const PAD = { t: 28, r: 18, b: 36, l: 44 };

/**
 * The chapter's four load-test stages. Bars are acquire p95.
 * Stages above the admission limit are not reached.
 */
export function AdmissionQueueViz({
  stage,
  limit,
  p95,
  p95Limit,
  reject,
}: {
  stage: number;
  limit: number;
  p95: number;
  p95Limit: number;
  reject: number;
}) {
  const maxP95 = 90;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const barW = innerW / STAGES.length - 18;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            Load-test stages
          </p>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--drill-muted)]">
            300 and 400 lookups a second pass both bars. 480 rejects about 2 percent while acquire p95 is still 25 ms. 560 rejects 120 of 560.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          now {stage.toFixed(0)}/s · limit {limit.toFixed(0)}/s
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Load test stages. Current stage ${stage.toFixed(0)} lookups per second. Admission limit ${limit.toFixed(0)}. Acquire p95 ${p95.toFixed(0)} milliseconds. Rejections ${(reject * 100).toFixed(1)} percent.`}
      >
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={PAD.t + innerH * (1 - p95Limit / maxP95)}
          y2={PAD.t + innerH * (1 - p95Limit / maxP95)}
          stroke="var(--drill-signal)"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <text
          x={W - PAD.r}
          y={PAD.t + innerH * (1 - p95Limit / maxP95) - 4}
          textAnchor="end"
          fill="var(--drill-signal)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {p95Limit} ms
        </text>
        {STAGES.map((rate, index) => {
          const stats = stageStats(rate);
          const reached = rate <= limit + 0.5;
          const current = reached && Math.abs(rate - stage) < 1;
          const x = PAD.l + index * (innerW / STAGES.length) + 8;
          const h = (Math.min(stats.p95, maxP95) / maxP95) * innerH;
          const failed = stats.p95 >= p95Limit || stats.reject >= 0.01;
          return (
            <g key={rate}>
              <rect
                x={x}
                y={PAD.t + innerH - h}
                width={barW}
                height={h}
                rx={3}
                fill={failed ? "var(--drill-accent)" : "var(--drill-signal)"}
                fillOpacity={reached ? (current ? 0.95 : 0.55) : 0.18}
              />
              <text
                x={x + barW / 2}
                y={H - 12}
                textAnchor="middle"
                fill="var(--drill-fg)"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {rate}/s
              </text>
              <text
                x={x + barW / 2}
                y={PAD.t + innerH - h - 6}
                textAnchor="middle"
                fill="var(--drill-muted)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {reached ? `${stats.p95.toFixed(0)} ms` : "held"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="border-t border-[color:var(--drill-line)] px-4 py-3 text-[0.75rem] leading-relaxed text-[color:var(--drill-muted)] sm:px-5">
        This stage rejects {(reject * 100).toFixed(1)} percent. Acquire p95 is {p95.toFixed(0)} ms. A pass needs both numbers inside the bars, on the last stage that clears them.
      </div>
    </div>
  );
}
