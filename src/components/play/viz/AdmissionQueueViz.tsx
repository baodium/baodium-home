"use client";

/**
 * Dual admission lanes: VIP priority vs regular, with shed overflow.
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
  const cap = Math.max(1, queueCap);
  const vipSlots = 18;
  const restSlots = 24;
  const vipFill = Math.min(vipSlots, Math.round((vipQueue / cap) * vipSlots * (vipFirst ? 1.4 : 1)));
  const restFill = Math.min(restSlots, Math.round((restQueue / cap) * restSlots));
  const shedHint = admit < 0.95;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
            Admission queue
          </p>
          <p className="mt-1 text-sm text-[color:var(--drill-muted)]">
            VIP and regular lanes · capacity fixed · admit {(admit * 100).toFixed(0)}%
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          p95 {p95.toFixed(0)}ms / {p95Limit}ms · λ {arrivals.toFixed(0)}/s
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Lane
          title="VIP"
          subtitle={vipFirst ? "Priority drain" : "Fair share"}
          depth={vipQueue}
          filled={vipFill}
          slots={vipSlots}
          accent="var(--drill-signal)"
        />
        <Lane
          title="Regular"
          subtitle={shedHint ? "Shed lands here first" : "Shared with VIP"}
          depth={restQueue}
          filled={restFill}
          slots={restSlots}
          accent="var(--drill-accent)"
        />
      </div>

      <div className="border-t border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3 text-[0.72rem] text-[color:var(--drill-muted)]">
          <span>Queue cap {queueCap}</span>
          <span className="tabular-nums">
            Depth {Math.round(vipQueue + restQueue)} / {queueCap}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--drill-track)]">
          <div
            className="h-full rounded-full bg-[color:var(--drill-signal)] transition-[width] duration-200"
            style={{
              width: `${Math.min(100, ((vipQueue + restQueue) / cap) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Lane({
  title,
  subtitle,
  depth,
  filled,
  slots,
  accent,
}: {
  title: string;
  subtitle: string;
  depth: number;
  filled: number;
  slots: number;
  accent: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-medium text-[color:var(--drill-fg)]">{title}</p>
          <p className="text-[0.78rem] text-[color:var(--drill-muted)]">{subtitle}</p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          {Math.round(depth)}
        </p>
      </div>
      <div
        className="mt-3 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(8, slots)}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[3px] border border-[color:var(--drill-line)]"
            style={{
              background:
                i < filled
                  ? `color-mix(in srgb, ${accent} ${55 + (i % 3) * 8}%, transparent)`
                  : "var(--drill-panel-soft)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
