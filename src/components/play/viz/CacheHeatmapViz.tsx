"use client";

import { useMemo } from "react";
import * as d3 from "d3";

/**
 * Hot-key heatmap. Cell color is a D3 sequential scale from cool panel to accent.
 * The engine tracks one hot key; neighbors are a projection of that TTL cycle.
 */
export function CacheHeatmapViz({
  t,
  ttlSec,
  keyAge,
  filling,
  fillRemainingSec,
  singleflight,
  softTtl,
  waitingOnFill,
  inFlightMisses,
  originLoad,
  stampeded,
}: {
  t: number;
  ttlSec: number;
  keyAge: number;
  filling: boolean;
  fillRemainingSec: number;
  singleflight: boolean;
  softTtl: boolean;
  waitingOnFill: number;
  inFlightMisses: number;
  originLoad: number;
  stampeded: boolean;
}) {
  const ttl = Math.max(0.8, ttlSec);
  const color = useMemo(
    () => d3.scaleSequential(d3.interpolateRgb("#e7eef3", "#ad4f36")).domain([0, 1]),
    [],
  );
  const cells = useMemo(() => {
    const rows = 5;
    const cols = 8;
    const out: { id: string; heat: number; hot: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.hypot(r - 2, c - 3);
        const phase = ((t * 0.35 + r * 0.7 + c * 0.45) % ttl) / ttl;
        const neighborAge = filling && dist < 1.6 ? 1 : Math.min(1, phase + dist * 0.04);
        const hot = dist < 1.15;
        const ageFrac = hot ? Math.min(1, keyAge / ttl) : neighborAge;
        const heat =
          filling && hot
            ? stampeded
              ? 1
              : 0.72
            : ageFrac > 0.85
              ? 0.55 + ageFrac * 0.35
              : 0.12 + ageFrac * 0.35;
        out.push({ id: `${r}-${c}`, heat: Math.max(0, Math.min(1, heat)), hot });
      }
    }
    return out;
  }, [t, ttl, keyAge, filling, stampeded]);

  const ttlPct = Math.min(100, (keyAge / ttl) * 100);
  const cell = 36;
  const gap = 5;
  const cols = 8;
  const rows = 5;
  const svgW = cols * cell + (cols - 1) * gap;
  const svgH = rows * cell + (rows - 1) * gap;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
            Heatmap · TTL · singleflight
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Hot key age against its neighbors. Outlined cells are the key everyone is asking for.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          Origin {originLoad.toFixed(2)}×
        </p>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-[1.2fr_0.8fr] sm:p-5">
        <div>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="h-auto w-full"
            role="img"
            aria-label="Cache key heat map. Brighter cells are closer to expiry."
          >
            {cells.map((item, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              return (
                <rect
                  key={item.id}
                  x={col * (cell + gap)}
                  y={row * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={color(item.heat)}
                  stroke={item.hot ? "#2f7a7e" : "transparent"}
                  strokeWidth={item.hot ? 2 : 0}
                />
              );
            })}
          </svg>
          <div className="mt-3 flex items-center gap-2 text-[0.72rem] text-[color:var(--drill-muted)]">
            <span>Fresh</span>
            <span className="flex h-2 flex-1 overflow-hidden rounded-sm" aria-hidden>
              {d3.range(8).map((step) => (
                <span key={step} className="h-full flex-1" style={{ background: color(step / 7) }} />
              ))}
            </span>
            <span>Near expiry</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[0.72rem] text-[color:var(--drill-muted)]">
              <span>TTL age</span>
              <span className="tabular-nums text-[color:var(--drill-fg)]">
                {keyAge.toFixed(1)}s / {ttl.toFixed(1)}s
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--drill-track)]">
              <div
                className="h-full rounded-full bg-[color:var(--drill-accent)] transition-[width] duration-200"
                style={{ width: `${ttlPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel-soft)] p-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)]">
              Fill window
            </p>
            {filling ? (
              <>
                <p className="mt-1.5 text-sm text-[color:var(--drill-fg)]">
                  Refilling · {fillRemainingSec.toFixed(1)}s left
                </p>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--drill-muted)]">
                  {singleflight
                    ? `Singleflight: 1 leader and ${Math.round(waitingOnFill)} waiters share one origin fill.`
                    : `Herd: about ${inFlightMisses} concurrent misses reach origin together.`}
                  {softTtl ? " Soft TTL still serves the stale value while that fill runs." : ""}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--drill-muted)]">
                The key is warm. The next miss lands when TTL age reaches the limit.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
