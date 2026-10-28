"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { EngineSnapshot } from "@/lib/experience/types";

export type MitigationPatch = {
  acquireTimeoutSec?: number | null;
  shedAtUtil?: number | null;
  cacheHitRate?: number;
};

/**
 * Engineer levers that change the same sim: bound wait, shed under util, cut W via cache.
 * Each control names the production analogue so this is practice, not a toy slider row.
 */
export function MitigationControls({
  snap,
  onChange,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  onChange: (patch: MitigationPatch) => void;
  reducedMotion?: boolean;
}) {
  const c = snap.controls;
  const timeoutOn = c.acquireTimeoutSec !== null;
  const shedOn = c.shedAtUtil !== null;

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Mitigations</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          Change one lever · read ops
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Real incident tools: bound acquire wait, shed the optional path under saturation, or shorten
        hold time with a cache. Disable (flag panel) still stops new demand cold.
      </p>

      <div className="mt-4 space-y-4">
        <MitigationRow
          title="Acquire timeout"
          prod="connectionTimeout / pool borrow deadline"
          active={timeoutOn}
          reducedMotion={reducedMotion}
        >
          <div className="flex flex-wrap gap-2">
            {(
              [
                [null, "Off"],
                [0.05, "50ms"],
                [0.1, "100ms"],
                [0.25, "250ms"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ acquireTimeoutSec: v })}
                className={`exp-btn !min-h-9 !px-3 font-mono text-[0.72rem] ${
                  c.acquireTimeoutSec === v ? "exp-btn-solid" : "exp-btn-ghost"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[color:var(--exp-muted)]">
            Caps queueing delay; converts long waits into{" "}
            <span className="font-mono text-[color:var(--exp-fg)]">acquire.timeouts</span>. Prefer
            shedding or disable before living on the timeout wall.
          </p>
        </MitigationRow>

        <MitigationRow
          title="Load shed at util"
          prod="Skip optional work when pool.util is high"
          active={shedOn}
          reducedMotion={reducedMotion}
        >
          <div className="flex flex-wrap gap-2">
            {(
              [
                [null, "Off"],
                [0.7, "70%"],
                [0.85, "85%"],
                [0.95, "95%"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ shedAtUtil: v })}
                className={`exp-btn !min-h-9 !px-3 font-mono text-[0.72rem] ${
                  c.shedAtUtil === v ? "exp-btn-solid" : "exp-btn-ghost"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[color:var(--exp-muted)]">
            New exposed arrivals skip the recs lookup when busy/pool ≥ threshold. Protects the page;
            degrades recommendations first.
          </p>
        </MitigationRow>

        <MitigationRow
          title="Cache hit rate"
          prod="Shorten W. hits skip the long hold"
          active={c.cacheHitRate > 0}
          reducedMotion={reducedMotion}
        >
          <label className="block text-sm text-[color:var(--exp-muted)]">
            Hits:{" "}
            <span className="font-mono tabular-nums text-[color:var(--exp-fg)]">
              {Math.round(c.cacheHitRate * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={Math.round(c.cacheHitRate * 100)}
              onChange={(e) => onChange({ cacheHitRate: Number(e.target.value) / 100 })}
              className="mt-2 w-full accent-[color:var(--exp-accent)]"
            />
          </label>
          <p className="mt-2 text-xs text-[color:var(--exp-muted)]">
            Attacks <span className="font-mono">W</span> in L = λ × W. Does not change arrival rate
           . compare with disable (cuts demand) under the same pressure.
          </p>
        </MitigationRow>
      </div>
    </div>
  );
}

function MitigationRow({
  title,
  prod,
  active,
  children,
  reducedMotion,
}: {
  title: string;
  prod: string;
  active: boolean;
  children: ReactNode;
  reducedMotion?: boolean;
}) {
  return (
    <motion.div
      layout={!reducedMotion}
      className={`rounded-xl border px-3 py-3 ${
        active
          ? "border-[color-mix(in_srgb,var(--exp-amber)_45%,transparent)] bg-[color-mix(in_srgb,var(--exp-amber)_6%,transparent)]"
          : "border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_40%,transparent)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-[color:var(--exp-fg)]">{title}</p>
        {active ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-amber)]">
            armed
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 font-mono text-[0.6rem] text-[color:var(--exp-faint)]">{prod}</p>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}
