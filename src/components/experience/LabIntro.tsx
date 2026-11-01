"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Human prose intro for Chapter labs (Tail Latency pattern).
 * No meta labels like Training brief / Debrief.
 */
export function LabIntro({
  challenge,
  situation,
  objective,
  terms,
  explore,
  gettingStarted,
  embedded = false,
}: {
  challenge: string;
  situation: string;
  objective: string;
  terms: string;
  explore: string;
  gettingStarted: string;
  /** Sit inside the workbench rail instead of above the simulation. */
  embedded?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.section
      aria-label="Lab overview"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.12, ease }}
      className={
        embedded
          ? "overflow-hidden rounded-2xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)]"
          : "mt-7 overflow-hidden rounded-2xl border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] shadow-[0_22px_48px_-30px_rgba(26,35,48,0.2)]"
      }
    >
      <div className="space-y-4 px-4 py-5 sm:px-5 sm:py-6">
        <h2 className="font-serif text-[1.35rem] leading-snug tracking-[-0.02em] text-[color:var(--exp-fg)] sm:text-[1.5rem]">
          {challenge}
        </h2>
        <p className="text-[0.98rem] leading-relaxed text-[color:var(--exp-muted)]">
          {situation}
        </p>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            Your objective
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--exp-fg)]">
            {objective}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--exp-muted)]">{terms}</p>
        <p className="font-mono text-[0.72rem] leading-relaxed tracking-[0.02em] text-[color:var(--exp-amber-text)]">
          {explore}
        </p>
        <div className="border-t border-[color:var(--exp-line)] pt-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            Getting started
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--exp-fg)]/90">
            {gettingStarted}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
