"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { EngineSnapshot } from "@/lib/experience/types";

export type MitigationPatch = {
  acquireTimeoutSec?: number | null;
  shedAtUtil?: number | null;
  cacheHitRate?: number;
};

/** Bound how long a request may wait for a connection. The flag is what stops new calls. */
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

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Acquire timeout</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
        The flag stops new recommendation calls. A timeout only ends a wait that is already in
        the queue. The query time does not have to change.
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
            Ends a wait that has already started. It does not stop the next recommendation call.
            That is what the flag does.
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
          : "border-[color:var(--exp-line)] bg-[color:var(--exp-chip)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-[color:var(--exp-fg)]">{title}</p>
        {active ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-amber-text)]">
            armed
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 font-mono text-[0.6rem] text-[color:var(--exp-faint)]">{prod}</p>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}
