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
 * Chapter lab intro as flowing prose — teaching without stage-name chrome.
 */
export function TrainingBrief({
  simulate,
  why,
  technologies,
  simulation,
  interpret,
}: TrainingBriefProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.section
      aria-label="Lab context"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.12, ease }}
      className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] shadow-[0_22px_48px_-30px_rgba(26,35,48,0.2)]"
    >
      <div className="space-y-4 px-4 py-5 sm:px-5 sm:py-6">
        <p className="text-[0.98rem] leading-relaxed text-[color:var(--exp-fg)]">
          {simulate}
        </p>
        <p className="text-sm leading-relaxed text-[color:var(--exp-muted)]">{why}</p>
        <p className="font-mono text-[0.72rem] leading-relaxed tracking-[0.02em] text-[color:var(--exp-amber-text)]">
          {technologies.join(" · ")}
        </p>
        <div className="grid gap-4 border-t border-[color:var(--exp-line)] pt-4 sm:grid-cols-2 sm:gap-6">
          <p className="text-sm leading-relaxed text-[color:var(--exp-fg)]/90">{simulation}</p>
          <p className="text-sm leading-relaxed text-[color:var(--exp-muted)]">{interpret}</p>
        </div>
      </div>
    </motion.section>
  );
}
