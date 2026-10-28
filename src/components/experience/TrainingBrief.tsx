"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

export type TrainingBriefProps = {
  simulate: string;
  why: string;
  technologies: string[];
  simulation: string;
  interpret: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Fixed briefing block for Chapter labs (EC-Council training order).
 * Numbered steps enter in sequence so the teaching path reads clearly.
 */
export function TrainingBrief({
  simulate,
  why,
  technologies,
  simulation,
  interpret,
}: TrainingBriefProps) {
  const reduced = usePrefersReducedMotion();
  const rows = [
    { k: "What we simulate", v: simulate },
    { k: "Why it matters", v: why },
    { k: "Technologies", v: technologies.join(" · ") },
    { k: "Simulation", v: simulation },
    { k: "Interpret results", v: interpret },
  ];

  return (
    <motion.section
      aria-label="Training brief"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.12, ease }}
      className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] shadow-[0_22px_48px_-30px_rgba(26,35,48,0.2)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--exp-line)] bg-[color-mix(in_srgb,var(--exp-signal)_7%,transparent)] px-4 py-3.5 sm:px-5">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--exp-signal)]">
            Training brief
          </p>
          <p className="mt-1 text-sm text-[color:var(--exp-muted)]">
            Read this once, then run the guided walkthrough.
          </p>
        </div>
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          05 steps
        </p>
      </div>
      <ol className="divide-y divide-[color:var(--exp-line)]">
        {rows.map((row, index) => (
          <motion.li
            key={row.k}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduced ? 0 : 0.4,
              delay: reduced ? 0 : 0.18 + index * 0.06,
              ease,
            }}
            className="grid gap-2 px-4 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5 sm:px-5"
          >
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--exp-amber)]">
              <span className="mr-2 text-[color:var(--exp-faint)]">0{index + 1}</span>
              {row.k}
            </p>
            <p className="text-sm leading-relaxed text-[color:var(--exp-fg)]/90">{row.v}</p>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}
