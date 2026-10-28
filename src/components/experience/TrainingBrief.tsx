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
 * Pre-lab context for Chapter experiences. Natural titles only; no pedagogy chrome.
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
    { k: "The scenario", v: simulate },
    { k: "In production", v: why },
    { k: "Stack", v: technologies.join(" · ") },
    { k: "Your walkthrough", v: simulation },
    { k: "Success looks like", v: interpret },
  ];

  return (
    <motion.section
      aria-label="Before you start"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.12, ease }}
      className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] shadow-[0_22px_48px_-30px_rgba(26,35,48,0.2)]"
    >
      <div className="border-b border-[color:var(--exp-line)] bg-[color-mix(in_srgb,var(--exp-signal)_7%,transparent)] px-4 py-3.5 sm:px-5">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--exp-signal)]">
          Before you start
        </p>
        <p className="mt-1 text-sm text-[color:var(--exp-muted)]">
          Skim this once, then run the guided walkthrough.
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
              {row.k}
            </p>
            <p className="text-sm leading-relaxed text-[color:var(--exp-fg)]/90">{row.v}</p>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}
