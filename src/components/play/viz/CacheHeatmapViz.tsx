"use client";

/**
 * One product-metadata key. No neighbor grid and no moving cells.
 * Catalog reads and source_read_limit are the numbers the chapter counts.
 */
export function CacheHeatmapViz({
  ttlSec,
  singleflight,
  waitingOnFill,
  inFlightMisses,
  fresh = false,
  permit = true,
  readers = 0,
}: {
  t?: number;
  ttlSec: number;
  keyAge?: number;
  filling?: boolean;
  fillRemainingSec?: number;
  singleflight: boolean;
  waitingOnFill: number;
  inFlightMisses: number;
  originLoad?: number;
  stampeded?: boolean;
  fresh?: boolean;
  permit?: boolean;
  readers?: number;
}) {
  const shown = Math.min(8, Math.max(readers, inFlightMisses > 0 ? 1 : 0));
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            product-metadata:v1
          </p>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--drill-muted)]">
            Cache-aside, TTL {ttlSec.toFixed(0)} seconds. A fresh entry does not call Catalog. A miss is one key.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          Catalog reads {inFlightMisses}
        </p>
      </div>

      <svg
        viewBox="0 0 640 168"
        className="h-auto w-full"
        role="img"
        aria-label={`Product metadata key. Catalog reads ${inFlightMisses}. Readers turned away ${waitingOnFill}.`}
      >
        {Array.from({ length: shown }, (_, i) => {
          const x = 36 + i * 28;
          return (
            <g key={i}>
              <circle cx={x} cy={48} r={8} fill="var(--drill-muted)" />
              <line
                x1={x}
                y1={56}
                x2={singleflight || fresh || !permit ? 250 : 250 + (i - (shown - 1) / 2) * 6}
                y2={108}
                stroke="var(--drill-line)"
                strokeWidth={1.4}
              />
            </g>
          );
        })}
        <rect x={210} y={100} width={88} height={36} rx={6} fill="var(--drill-panel-soft)" stroke="var(--drill-fg)" />
        <text x={254} y={122} textAnchor="middle" fill="var(--drill-fg)" fontSize="12">
          {fresh ? "fresh" : singleflight ? "1 loader" : "each loads"}
        </text>
        <line x1={298} y1={118} x2={390} y2={118} stroke="var(--drill-line)" strokeWidth={1.4} />
        <rect x={390} y={96} width={150} height={44} rx={6} fill="var(--drill-signal)" fillOpacity={inFlightMisses > 0 ? 0.9 : 0.25} />
        <text x={465} y={122} textAnchor="middle" fill="var(--drill-fg)" fontSize="12">
          Catalog {inFlightMisses}
        </text>
      </svg>

      <div className="border-t border-[color:var(--drill-line)] px-4 py-3 text-[0.75rem] leading-relaxed text-[color:var(--drill-muted)] sm:px-5">
        {fresh
          ? "The entry is inside its TTL. Catalog is not called."
          : !permit
            ? `try_acquire returned nothing. ${waitingOnFill} readers got source_read_limit.`
            : singleflight
              ? "The readers share one loader. Catalog sees one read."
              : `${inFlightMisses} readers each call catalog_db.fetch_metadata for this missed key.`}
      </div>
    </div>
  );
}
