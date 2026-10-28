"use client";

import { useMemo } from "react";

/**
 * Hot-key heatmap with TTL age + singleflight coalesce state.
 * Engine is single-hot-key; we project a neighbor grid from that TTL cycle.
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
  const cells = useMemo(() => {
    const rows = 5;
    const cols = 8;
    const out: { id: string; heat: number; ageFrac: number; hot: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.hypot(r - 2, c - 3);
        const phase = ((t * 0.35 + r * 0.7 + c * 0.45) % ttl) / ttl;
        const neighborAge = filling && dist < 1.6 ? 1 : Math.min(1, phase + dist * 0.04);
        const hot = dist < 1.15;
        const ageFrac = hot ? Math.min(1, keyAge / ttl) : neighborAge;
        const heat = filling && hot
          ? stampeded
            ? 1
            : 0.72
          : ageFrac > 0.85
            ? 0.55 + ageFrac * 0.35
            : 0.12 + ageFrac * 0.35;
        out.push({ id: `${r}-${c}`, heat, ageFrac, hot });
      }
    }
    return out;
  }, [t, ttl, keyAge, filling, stampeded]);

  const ttlPct = Math.min(100, (keyAge / ttl) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
            Heatmap · TTL · singleflight
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            Hot key age vs neighbors · coalesce state during fill
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          Origin {originLoad.toFixed(2)}×
        </p>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-5">
        <div>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
            role="img"
            aria-label="Cache key heat map"
          >
            {cells.map((cell) => (
              <span
                key={cell.id}
                className={`aspect-square rounded-[3px] border ${
                  cell.hot
                    ? "border-[color:var(--drill-signal)]"
                    : "border-[color:var(--drill-line)]"
                }`}
                style={{
                  background: `color-mix(in srgb, var(--drill-accent) ${Math.round(cell.heat * 78)}%, var(--drill-panel-soft))`,
                }}
                title={cell.hot ? "Hot key" : undefined}
              />
            ))}
          </div>
          <p className="mt-2 text-[0.72rem] text-[color:var(--drill-muted)]">
            Brighter cells are closer to expiry. Outlined cell is the hot key.
          </p>
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
                    ? `Singleflight: 1 leader + ${Math.round(waitingOnFill)} waiters coalesce on one origin fill.`
                    : `Herd: ~${inFlightMisses} concurrent misses punch origin.`}
                  {softTtl ? " Soft TTL still serves stale." : ""}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-[color:var(--drill-muted)]">
                Warm. Next expiry lands when TTL age reaches the limit.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
