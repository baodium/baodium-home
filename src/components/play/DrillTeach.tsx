"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Scenario context for a Play drill (structure is internal; labels stay human).
 */
export type DrillLesson = {
  simulate: string;
  why: string;
  technologies: string[];
  simulation: string;
  interpret: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

const cellsFrom = (lesson: DrillLesson) => [
  { kicker: "In production", body: lesson.why },
  { kicker: "Stack", body: lesson.technologies.join(" · "), muted: true },
  { kicker: "Your shift", body: lesson.simulation, accent: true },
  { kicker: "Success looks like", body: lesson.interpret, muted: true },
];

export function DrillTeach({
  lesson,
  compact = false,
}: {
  lesson: DrillLesson;
  /** During a live run, collapse to a one-line summary so the stage stays airy. */
  compact?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const key = `${compact ? "c" : "f"}|${lesson.simulate.slice(0, 24)}|${lesson.simulation.slice(0, 24)}|${lesson.interpret.slice(0, 24)}`;
  const cells = cellsFrom(lesson);

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.aside
          key={key}
          role="note"
          aria-label="Scenario"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.3, ease }}
          className="mt-6 overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]"
        >
          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none sm:px-5 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--drill-signal)]">
                    Scenario
                  </p>
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-[color:var(--drill-fg)]">
                    {lesson.simulate}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)] group-open:hidden">
                  More
                </span>
                <span className="hidden shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)] group-open:inline">
                  Less
                </span>
              </div>
            </summary>
            <dl className="grid gap-0 border-t border-[color:var(--drill-line)] sm:grid-cols-2">
              {cells.map((cell) => (
                <div
                  key={cell.kicker}
                  className="border-t border-[color:var(--drill-line)] px-4 py-3.5 sm:border-l sm:border-t-0 sm:px-5 sm:odd:border-l-0 sm:[&:nth-child(-n+2)]:border-t-0"
                >
                  <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
                    {cell.kicker}
                  </dt>
                  <dd
                    className={`mt-1.5 text-sm leading-relaxed ${
                      cell.accent
                        ? "text-[color:var(--drill-accent)]"
                        : cell.muted
                          ? "text-[color:var(--drill-muted)]"
                          : "text-[color:var(--drill-fg)]"
                    }`}
                  >
                    {cell.body}
                  </dd>
                </div>
              ))}
            </dl>
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
        aria-label="Scenario"
        aria-live="polite"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.38, ease }}
        className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] shadow-[0_20px_48px_-32px_rgba(26,35,48,0.28)]"
      >
        <div className="border-b border-[color:var(--drill-line)] bg-[color-mix(in_srgb,var(--drill-signal)_6%,transparent)] px-4 py-3.5 sm:px-5">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--drill-signal)]">
            Scenario
          </p>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[color:var(--drill-fg)]">
            {lesson.simulate}
          </p>
        </div>
        <dl className="grid gap-0 sm:grid-cols-2">
          {cells.map((cell, index) => (
            <motion.div
              key={cell.kicker}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.35,
                delay: reduced ? 0 : 0.08 + index * 0.05,
                ease,
              }}
              className="border-t border-[color:var(--drill-line)] px-4 py-3.5 sm:border-l sm:border-t-0 sm:px-5 sm:odd:border-l-0"
            >
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--drill-faint)]">
                {cell.kicker}
              </dt>
              <dd
                className={`mt-1.5 text-sm leading-relaxed ${
                  cell.accent
                    ? "text-[color:var(--drill-accent)]"
                    : cell.muted
                      ? "text-[color:var(--drill-muted)]"
                      : "text-[color:var(--drill-fg)]"
                }`}
              >
                {cell.body}
              </dd>
            </motion.div>
          ))}
        </dl>
      </motion.aside>
    </AnimatePresence>
  );
}
