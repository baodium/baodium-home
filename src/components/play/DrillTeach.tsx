"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Human teaching prose for Play drills (Adewale Tail Latency gold pattern).
 * Natural headings only; never "Training brief" / stage chrome.
 */
export type DrillProse = {
  /** Short title after "Drills /" */
  title: string;
  /** Clear challenge question for the H1 */
  challenge: string;
  /** Plain-English situation paragraphs */
  situation: ReactNode;
  /** Measurable win condition */
  objective: string;
  /** Key terms explained in full sentences (optional) */
  terms?: ReactNode;
  /** Topic chips */
  explore: string[];
  /** How to run + what to watch */
  gettingStarted: string;
  /** Calm closing takeaway (not labeled as a debrief stage) */
  takeaway: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function DrillProseHeader({
  prose,
  compact = false,
}: {
  prose: DrillProse;
  /** During a live run, collapse teaching so the stage stays airy. */
  compact?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const key = `${compact ? "c" : "f"}|${prose.challenge.slice(0, 32)}`;

  return (
    <div className="drill-prose">
      <div className="max-w-3xl">
        <p className="drill-kicker">Drills / {prose.title}</p>
        <h1 className="mt-3 font-serif text-[clamp(1.85rem,4.2vw,2.85rem)] leading-[1.08] tracking-[-0.03em] text-[color:var(--drill-fg)]">
          {prose.challenge}
        </h1>
        {!compact ? (
          <div className="mt-5 space-y-3 text-[1.02rem] leading-relaxed text-[color:var(--drill-muted)]">
            {prose.situation}
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-[color:var(--drill-muted)]">
            {prose.objective}
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!compact ? (
          <motion.div
            key={key}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.38, ease }}
            className="mt-8 max-w-3xl space-y-7"
          >
            <section>
              <h2 className="drill-section-title">Your objective</h2>
              <p className="mt-2 text-[0.98rem] leading-relaxed text-[color:var(--drill-fg)]">
                {prose.objective}
              </p>
            </section>

            {prose.terms ? (
              <section>
                <p className="text-[0.98rem] leading-relaxed text-[color:var(--drill-muted)]">
                  {prose.terms}
                </p>
              </section>
            ) : null}

            <section>
              <h2 className="drill-section-title">What you&apos;ll explore</h2>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Topics">
                {prose.explore.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-md border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)] px-2.5 py-1 font-mono text-[0.68rem] tracking-[0.02em] text-[color:var(--drill-muted)]"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="drill-section-title">Getting started</h2>
              <p className="mt-2 text-[0.98rem] leading-relaxed text-[color:var(--drill-muted)]">
                {prose.gettingStarted}
              </p>
            </section>
          </motion.div>
        ) : (
          <motion.aside
            key={key}
            role="note"
            aria-label="Drill context"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.3, ease }}
            className="mt-5 overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]"
          >
            <details className="group">
              <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none sm:px-5 [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[0.92rem] leading-relaxed text-[color:var(--drill-fg)]">
                    {prose.objective}
                  </p>
                  <span className="shrink-0 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)] group-open:hidden">
                    More
                  </span>
                  <span className="hidden shrink-0 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)] group-open:inline">
                    Less
                  </span>
                </div>
              </summary>
              <div className="space-y-3 border-t border-[color:var(--drill-line)] px-4 py-3.5 sm:px-5">
                <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
                  {prose.gettingStarted}
                </p>
                <p className="font-mono text-[0.68rem] leading-relaxed tracking-[0.02em] text-[color:var(--drill-faint)]">
                  {prose.explore.join(" · ")}
                </p>
                <p className="text-sm leading-relaxed text-[color:var(--drill-muted)]">
                  {prose.takeaway}
                </p>
              </div>
            </details>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Section heading inside Live metrics / Adjust your settings panels. */
export function DrillPanelHeading({
  children,
  status,
}: {
  children: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="drill-section-title">{children}</h2>
      {status ? (
        <div className="text-[0.82rem] leading-snug text-[color:var(--drill-muted)]">
          {status}
        </div>
      ) : null}
    </div>
  );
}

/** Closing takeaway under the controls: calm sentence, not a stage label. */
export function DrillTakeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-relaxed text-[color:var(--drill-muted)]">
      <span className="text-[color:var(--drill-fg)]">Something to keep in mind. </span>
      {children}
    </p>
  );
}

/** @deprecated Prefer DrillProse. Kept for any stray imports during migrate. */
export type DrillLesson = {
  simulate: string;
  why: string;
  technologies: string[];
  simulation: string;
  interpret: string;
};

/** @deprecated Prefer DrillProseHeader */
export function DrillTeach({
  lesson,
  compact = false,
}: {
  lesson: DrillLesson;
  compact?: boolean;
}) {
  return (
    <DrillProseHeader
      compact={compact}
      prose={{
        title: "Drill",
        challenge: lesson.simulate,
        situation: <p>{lesson.why}</p>,
        objective: lesson.interpret,
        explore: lesson.technologies,
        gettingStarted: lesson.simulation,
        takeaway: lesson.why,
      }}
    />
  );
}
