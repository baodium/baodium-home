"use client";

import { motion } from "motion/react";
import type { EngineSnapshot, SimRequest } from "@/lib/experience/types";
import { readChapter1 } from "@/lib/experience/readout";

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
  const read = readChapter1(snap);

  const fillRatio = read.busy / read.poolSize;
  const wall = read.waiting > 0 || read.demand > read.poolSize;
  /** Visual pressure only. rail TeachingOverlay owns the prose so-what. */
  const statusLine =
    snap.controls.featureDisabledForNew && read.busy > 0
      ? "Disable draining. In-flight holds finishing"
      : snap.timeoutCount > 0 && snap.controls.acquireTimeoutSec !== null
        ? `${snap.timeoutCount} acquire timeout${snap.timeoutCount === 1 ? "" : "s"}`
        : read.waiting > 0
          ? `${read.waiting} pending acquisitions. Acquire p99 ${(read.acquireWaitP99Sec * 1000).toFixed(0)} ms.`
          : fillRatio > 0.85
            ? `${read.busy} of ${read.poolSize} connections are assigned.`
            : null;

  return (
    <div className={`exp-panel ${wall ? "exp-panel-pressure" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Connection pool</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--exp-muted)]">
          <span className="tabular-nums text-[color:var(--exp-fg)]">
            {read.busy}/{read.poolSize}
          </span>{" "}
          busy ·{" "}
          <span
            className={`tabular-nums ${
              read.waiting > 0 ? "text-[color:var(--exp-accent-text)]" : ""
            }`}
          >
            {read.waiting}
          </span>{" "}
          waiting
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Inside Recommendation. Each instance allows {read.poolSize} connections, shared with the home page and checkout. Catalog does not take one.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 font-mono text-[0.78rem] text-[color:var(--exp-fg)] sm:grid-cols-2">
        <ReadoutRow label="assigned_connections" value={String(read.busy)} />
        <ReadoutRow label="idle_connections" value={String(read.idle)} />
        <ReadoutRow label="pending_acquisitions" value={String(read.waiting)} />
        <ReadoutRow label="acquire_p99" value={ms(read.acquireWaitP99Sec)} />
        <ReadoutRow label="query_p99" value={read.queryP99Sec === null ? "no completed query" : ms(read.queryP99Sec)} />
        <ReadoutRow
          label="occupancy_mean"
          value={read.occupancyMeanSec === null ? "no completed query" : ms(read.occupancyMeanSec)}
        />
      </dl>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--exp-slot-free)]"
        aria-hidden="true"
      >
        <motion.div
          className={`h-full rounded-full ${
            fillRatio > 0.92
              ? "bg-[color:var(--exp-accent)]"
              : fillRatio > 0.6
                ? "bg-[color:var(--exp-amber)]"
                : "bg-[color:var(--exp-slot-base)]"
          }`}
          initial={false}
          animate={{ width: `${Math.min(100, fillRatio * 100)}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {statusLine ? (
        <p className="mt-3 font-mono text-[0.68rem] leading-snug text-[color:var(--exp-accent-text)]">
          {statusLine}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[300px] shrink-0"
          role="img"
          aria-label={`${read.busy} of ${read.poolSize} connections occupied`}
        >
          {snap.slots.map((slot) => {
            const col = slot.index % COLS;
            const row = Math.floor(slot.index / COLS);
            const x = pad + col * (cell + gap);
            const y = pad + row * (cell + gap);
            const busy = slot.requestId !== null;
            const selected = slot.requestId !== null && slot.requestId === selectedId;
            const fill = !busy
              ? "var(--exp-slot-free)"
              : "var(--exp-slot-recs)";
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
                className={busy ? "cursor-pointer" : undefined}
                style={
                  reducedMotion
                    ? undefined
                    : { transition: "fill 320ms linear" }
                }
                onClick={() => onSelect(busy ? slot.requestId : null)}
              >
                <title>
                  {busy
                    ? `Slot ${slot.index + 1}: recommendation`
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
              {waiters.map((req) => (
                <WaiterChip
                  key={req.id}
                  req={req}
                  selected={req.id === selectedId}
                  onSelect={onSelect}
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
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--exp-slot-recs)]" />{" "}
              Assigned
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--exp-slot-free)] ring-1 ring-[color:var(--exp-line)]" />{" "}
              Idle
            </span>
          </div>
          {snap.controls.featureDisabledForNew ? (
            <p className="mt-3 rounded-lg border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,var(--exp-accent)_6%,transparent)] px-3 py-2 text-xs leading-relaxed text-[color:var(--exp-fg)]">
              The flag is off for new calls. Connections already assigned still finish the query, then release.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ms(seconds: number): string {
  return `${(seconds * 1000).toFixed(0)} ms`;
}

function ReadoutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--exp-line)] py-1">
      <dt className="text-[color:var(--exp-muted)]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
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
