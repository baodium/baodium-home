"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * EC-Council-style training brief for Play drills:
 * what we simulate → why it matters → technologies → simulation → interpret results.
 */
export type DrillLesson = {
  simulate: string;
  why: string;
  technologies: string[];
  simulation: string;
  interpret: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function DrillTeach({ lesson }: { lesson: DrillLesson }) {
  const reduced = usePrefersReducedMotion();
  const key = `${lesson.simulate.slice(0, 24)}|${lesson.simulation.slice(0, 24)}|${lesson.interpret.slice(0, 24)}`;
  const cells = [
    { kicker: "Why it matters", body: lesson.why },
    { kicker: "Technologies", body: lesson.technologies.join(" · "), muted: true },
    { kicker: "Simulation", body: lesson.simulation, accent: true },
    { kicker: "Interpret results", body: lesson.interpret, muted: true },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={key}
        role="note"
        aria-label="Training brief"
        aria-live="polite"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.38, ease }}
        className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] shadow-[0_20px_48px_-32px_rgba(26,35,48,0.28)]"
      >
        <div className="border-b border-[color:var(--drill-line)] bg-[color-mix(in_srgb,var(--drill-signal)_6%,transparent)] px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--drill-signal)]">
              Training brief · 01 What we simulate
            </p>
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[color:var(--drill-faint)]">
              Then run · then debrief
            </p>
          </div>
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
                <span className="mr-1.5 text-[color:var(--drill-signal)]">0{index + 2}</span>
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
