"use client";

import type { EngineSnapshot, SimRequest } from "@/lib/experience/types";

const COLS = 8;
const ROWS = 5;

export function ConnectionPoolGrid({
  snap,
  selectedId,
  onSelect,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  reducedMotion: boolean;
}) {
  const cell = 22;
  const gap = 4;
  const pad = 8;
  const width = pad * 2 + COLS * cell + (COLS - 1) * gap;
  const height = pad * 2 + ROWS * cell + (ROWS - 1) * gap;
  const waiters = snap.waiting.slice(0, 24);
  const overflowWaiters = Math.max(0, snap.waitingCount - waiters.length);

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-cream">Connection pool</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
          {snap.activeCount}/{snap.poolSize} busy · {snap.waitingCount} waiting
        </p>
      </div>
      <p className="mt-1 text-sm text-cream/55">
        Shared resource — active slots never exceed {snap.poolSize}. Excess demand waits.
      </p>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[280px] shrink-0"
          role="img"
          aria-label={`${snap.activeCount} of ${snap.poolSize} connections occupied`}
        >
          {snap.slots.map((slot) => {
            const col = slot.index % COLS;
            const row = Math.floor(slot.index / COLS);
            const x = pad + col * (cell + gap);
            const y = pad + row * (cell + gap);
            const busy = slot.requestId !== null;
            const selected = slot.requestId !== null && slot.requestId === selectedId;
            const fill = !busy
              ? "rgba(245,239,229,0.08)"
              : slot.exposed
                ? "#ad4f36"
                : "#dea27c";
            return (
              <rect
                key={slot.index}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={3}
                fill={fill}
                stroke={selected ? "#f5efe5" : "rgba(245,239,229,0.12)"}
                strokeWidth={selected ? 2 : 1}
                className={busy ? "cursor-pointer" : undefined}
                style={
                  busy && !reducedMotion
                    ? { transition: "fill 180ms ease" }
                    : undefined
                }
                onClick={() => onSelect(busy ? slot.requestId : null)}
              >
                <title>
                  {busy
                    ? `Slot ${slot.index + 1}: ${slot.exposed ? "recs" : "baseline"}`
                    : `Slot ${slot.index + 1}: free`}
                </title>
              </rect>
            );
          })}
        </svg>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cream/45">
            Waiters
          </p>
          {waiters.length === 0 ? (
            <p className="mt-2 text-sm text-cream/50">Queue empty.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {waiters.map((req) => (
                <WaiterChip
                  key={req.id}
                  req={req}
                  selected={req.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
              {overflowWaiters > 0 ? (
                <li className="rounded-md border border-cream/15 px-2 py-1 font-mono text-[0.65rem] text-cream/50">
                  +{overflowWaiters}
                </li>
              ) : null}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-cream/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber" /> Baseline hold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cinnabar" /> Recs hold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cream/15" /> Free
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaiterChip({
  req,
  selected,
  onSelect,
}: {
  req: SimRequest;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(req.id)}
        className={`rounded-md border px-2 py-1 font-mono text-[0.65rem] transition-colors ${
          selected
            ? "border-cream bg-cream/15 text-cream"
            : "border-cream/15 text-cream/70 hover:border-cream/35"
        }`}
      >
        {req.id}
        {req.exposed ? " · recs" : ""}
      </button>
    </li>
  );
}
