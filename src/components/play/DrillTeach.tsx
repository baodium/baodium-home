"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

export type DrillLesson = {
  /** What this experiment is testing — one concrete sentence. */
  experiment: string;
  /** What to watch in the meters / viz right now. */
  seeing: string;
  /** Why the observation matters in production systems. */
  why: string;
  /** Concrete next action. */
  tryNext?: string;
  /** Explicit win / success condition. */
  success: string;
};

/**
 * Ch.1-style Seeing / Why / Try pedagogy for play drills (dark ember chrome).
 */
export function DrillTeach({ lesson }: { lesson: DrillLesson }) {
  const reduced = usePrefersReducedMotion();
  const key = `${lesson.seeing.slice(0, 28)}|${lesson.tryNext ?? ""}`;

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={key}
        role="note"
        aria-label="How this drill teaches"
        aria-live="polite"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 overflow-hidden rounded-2xl border border-amber/25 bg-gradient-to-br from-cinnabar/15 via-night/45 to-transparent"
      >
        <div className="border-b border-white/10 px-4 py-3.5 sm:px-5">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-amber">
            This experiment
          </p>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-cream/88">
            {lesson.experiment}
          </p>
        </div>
        <dl
          className={`grid gap-0 sm:grid-cols-2 ${
            lesson.tryNext ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          <TeachCell kicker="Seeing" body={lesson.seeing} />
          <TeachCell kicker="Why" body={lesson.why} muted />
          {lesson.tryNext ? (
            <TeachCell kicker="Try" body={lesson.tryNext} accent />
          ) : null}
          <TeachCell kicker="Success" body={lesson.success} />
        </dl>
      </motion.aside>
    </AnimatePresence>
  );
}

function TeachCell({
  kicker,
  body,
  muted,
  accent,
}: {
  kicker: string;
  body: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="border-t border-white/10 px-4 py-3.5 sm:border-l sm:border-t-0 sm:px-5 sm:first:border-l-0">
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-cream/45">
        {kicker}
      </dt>
      <dd
        className={`mt-1.5 text-sm leading-relaxed ${
          accent
            ? "text-amber"
            : muted
              ? "text-cream/65"
              : "text-cream/82"
        }`}
      >
        {body}
      </dd>
    </div>
  );
}
