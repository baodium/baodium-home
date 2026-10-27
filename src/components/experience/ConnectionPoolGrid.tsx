"use client";

import { useEffect, useRef, useState } from "react";
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
  const cell = 24;
  const gap = 5;
  const pad = 10;
  const width = pad * 2 + COLS * cell + (COLS - 1) * gap;
  const height = pad * 2 + ROWS * cell + (ROWS - 1) * gap;
  const waiters = snap.waiting.slice(0, 28);
  const overflowWaiters = Math.max(0, snap.waitingCount - waiters.length);
  const prevBusy = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set(
      snap.slots.filter((s) => s.requestId).map((s) => s.requestId as string),
    );
    const acquired = new Set<string>();
    for (const id of next) {
      if (!prevBusy.current.has(id)) acquired.add(id);
    }
    prevBusy.current = next;
    if (acquired.size === 0 || reducedMotion) return;
    setFreshIds(acquired);
    const t = window.setTimeout(() => setFreshIds(new Set()), 450);
    return () => window.clearTimeout(t);
  }, [snap.slots, snap.t, reducedMotion]);

  const fillRatio = snap.activeCount / snap.poolSize;

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Connection pool</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--exp-muted)]">
          <span className="tabular-nums text-[color:var(--exp-fg)]">
            {snap.activeCount}/{snap.poolSize}
          </span>{" "}
          busy ·{" "}
          <span
            className={`tabular-nums ${
              snap.waitingCount > 0 ? "text-[color:var(--exp-accent)]" : ""
            }`}
          >
            {snap.waitingCount}
          </span>{" "}
          waiting
        </p>
      </div>
      <p className="mt-1 text-sm text-[color:var(--exp-muted)]">
        Shared resource — active slots never exceed {snap.poolSize}. Excess demand waits.
      </p>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--exp-slot-free)]"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            fillRatio > 0.92
              ? "bg-[color:var(--exp-accent)]"
              : fillRatio > 0.6
                ? "bg-[color:var(--exp-amber)]"
                : "bg-[color:var(--exp-slot-base)]"
          }`}
          style={{ width: `${Math.min(100, fillRatio * 100)}%` }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[300px] shrink-0"
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
            const fresh = busy && slot.requestId !== null && freshIds.has(slot.requestId);
            const fill = !busy
              ? "var(--exp-slot-free)"
              : slot.exposed
                ? "var(--exp-slot-recs)"
                : "var(--exp-slot-base)";
            return (
              <rect
                key={slot.index}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={4}
                fill={fill}
                stroke={selected ? "var(--exp-fg)" : "color-mix(in srgb, var(--exp-fg) 10%, transparent)"}
                strokeWidth={selected ? 2 : 1}
                className={`${busy ? "cursor-pointer" : ""} ${
                  fresh && !reducedMotion ? "exp-slot-busy" : ""
                }`}
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
          <p className="exp-kicker !tracking-[0.16em]">Waiters</p>
          {waiters.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--exp-muted)]">Queue empty.</p>
          ) : (
            <ul className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
              {waiters.map((req, i) => (
                <WaiterChip
                  key={req.id}
                  req={req}
                  selected={req.id === selectedId}
                  onSelect={onSelect}
                  delayIndex={i}
                  reducedMotion={reducedMotion}
                />
              ))}
              {overflowWaiters > 0 ? (
                <li className="rounded-md border border-[color:var(--exp-line)] px-2 py-1 font-mono text-[0.65rem] text-[color:var(--exp-muted)]">
                  +{overflowWaiters}
                </li>
              ) : null}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[color:var(--exp-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--exp-slot-base)]" />{" "}
              Baseline hold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--exp-slot-recs)]" />{" "}
              Recs hold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--exp-slot-free)] ring-1 ring-[color:var(--exp-line)]" />{" "}
              Free
            </span>
          </div>
          {snap.controls.featureDisabledForNew ? (
            <p className="mt-3 rounded-lg border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,var(--exp-accent)_6%,transparent)] px-3 py-2 text-xs leading-relaxed text-[color:var(--exp-fg)]">
              Disable active: new arrivals skip recommendations. Copper slots still holding finish
              their lookup before releasing — in-flight is not killed.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WaiterChip({
  req,
  selected,
  onSelect,
  delayIndex,
  reducedMotion,
}: {
  req: SimRequest;
  selected: boolean;
  onSelect: (id: string) => void;
  delayIndex: number;
  reducedMotion: boolean;
}) {
  return (
    <li
      className={!reducedMotion ? "exp-waiter-chip" : undefined}
      style={!reducedMotion ? { animationDelay: `${Math.min(delayIndex, 12) * 20}ms` } : undefined}
    >
      <button
        type="button"
        onClick={() => onSelect(req.id)}
        className={`rounded-md border px-2 py-1 font-mono text-[0.65rem] transition-colors ${
          selected
            ? "border-[color:var(--exp-fg)] bg-[color-mix(in_srgb,var(--exp-fg)_8%,transparent)] text-[color:var(--exp-fg)]"
            : "border-[color:var(--exp-line)] text-[color:var(--exp-muted)] hover:border-[color:var(--exp-line-strong)]"
        }`}
      >
        {req.id}
        {req.exposed ? " · recs" : ""}
      </button>
    </li>
  );
}
