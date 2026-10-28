"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Play drill intro as prose layout — teaching without stage-name chrome.
 */
export type DrillLesson = {
  simulate: string;
  why: string;
  technologies: string[];
  simulation: string;
  interpret: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function DrillTeach({
  lesson,
  compact = false,
}: {
  lesson: DrillLesson;
  /** During a live run, collapse so the stage stays airy. */
  compact?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const key = `${compact ? "c" : "f"}|${lesson.simulate.slice(0, 24)}|${lesson.simulation.slice(0, 24)}|${lesson.interpret.slice(0, 24)}`;

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.aside
          key={key}
          role="note"
          aria-label="Drill context"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.3, ease }}
          className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]"
        >
          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none sm:px-5 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[0.92rem] leading-relaxed text-[color:var(--drill-fg)]">
                  {lesson.simulate}
                </p>
                <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)] group-open:hidden">
                  More
                </span>
                <span className="hidden shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)] group-open:inline">
                  Less
                </span>
              </div>
            </summary>
            <div className="space-y-3 border-t border-[color:var(--drill-line)] px-4 py-3.5 sm:px-5">
              <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">{lesson.why}</p>
              <p className="font-mono text-[0.68rem] leading-relaxed tracking-[0.02em] text-[color:var(--drill-faint)]">
                {lesson.technologies.join(" · ")}
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--drill-accent)]">
                {lesson.simulation}
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
                {lesson.interpret}
              </p>
            </div>
          </details>
        </motion.aside>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={key}
        role="note"
        aria-label="Drill context"
        aria-live="polite"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.38, ease }}
        className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] shadow-[0_20px_48px_-32px_rgba(26,35,48,0.28)]"
      >
        <div className="space-y-3.5 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-[0.98rem] leading-relaxed text-[color:var(--drill-fg)]">
            {lesson.simulate}
          </p>
          <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">{lesson.why}</p>
          <p className="font-mono text-[0.7rem] leading-relaxed tracking-[0.02em] text-[color:var(--drill-faint)]">
            {lesson.technologies.join(" · ")}
          </p>
          <div className="grid gap-3 border-t border-[color:var(--drill-line)] pt-3.5 sm:grid-cols-2 sm:gap-5">
            <p className="text-sm leading-relaxed text-[color:var(--drill-accent)]">
              {lesson.simulation}
            </p>
            <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
              {lesson.interpret}
            </p>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
