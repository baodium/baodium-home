"use client";

import { AnimatePresence, motion } from "motion/react";
import type { PedagogyLesson } from "@/lib/experience/pedagogy";
import type { NarratorFrame } from "@/lib/experience/narrator";

const toneBorder: Record<PedagogyLesson["tone"], string> = {
  calm: "border-[color:var(--exp-line-strong)]",
  warn: "border-[color-mix(in_srgb,var(--exp-accent)_45%,transparent)]",
  insight: "border-[color-mix(in_srgb,var(--exp-amber)_55%,transparent)]",
  recover: "border-[color-mix(in_srgb,#3d6b4f_40%,transparent)]",
};

const toneGlow: Record<PedagogyLesson["tone"], string> = {
  calm: "from-[color-mix(in_srgb,var(--exp-amber)_10%,transparent)]",
  warn: "from-[color-mix(in_srgb,var(--exp-accent)_14%,transparent)]",
  insight: "from-[color-mix(in_srgb,var(--exp-amber)_16%,transparent)]",
  recover: "from-[color-mix(in_srgb,#3d6b4f_12%,transparent)]",
};

/**
 * Single teaching card: live Now chain (when provided) + So what / Try.
 * Seeing is omitted when LiveNarrator owns the live voice — no triple-speak.
 */
export function TeachingOverlay({
  lesson,
  live,
  reducedMotion,
  compactTry = false,
}: {
  lesson: PedagogyLesson;
  live?: NarratorFrame | null;
  reducedMotion: boolean;
  /** When guided step already has a CTA, skip competing Try line. */
  compactTry?: boolean;
}) {
  const showSeeing = !live;
  const cardKey = live ? `${lesson.id}|${live.chain}` : lesson.id;

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={cardKey}
        role="status"
        aria-live="polite"
        className={`exp-teach relative overflow-hidden border ${toneBorder[lesson.tone]}`}
        initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
        transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${toneGlow[lesson.tone]} to-transparent`}
        />
        <div className="relative">
          {live ? (
            <div
              className="mb-4 rounded-xl border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_62%,transparent)] px-3 py-2.5"
              data-tone={live.tone === "warn" ? "warn" : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-1.5 rounded-full bg-[color:var(--exp-amber)]"
                  style={
                    reducedMotion
                      ? undefined
                      : { animation: "exp-ops-pulse 2.2s ease-in-out infinite" }
                  }
                />
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--exp-amber)]">
                  Now
                </p>
              </div>
              <p className="mt-1.5 text-[0.95rem] leading-snug text-[color:var(--exp-fg)] tabular-nums">
                {live.segments.map((seg, i) => (
                  <span key={`${i}-${seg}`}>
                    {i > 0 ? (
                      <span className="text-[color:var(--exp-faint)]" aria-hidden="true">
                        {" "}
                        →{" "}
                      </span>
                    ) : null}
                    {seg}
                  </span>
                ))}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--exp-muted)]">
                {live.goodLooksLike}
              </p>
            </div>
          ) : (
            <p className="exp-kicker">{lesson.eyebrow}</p>
          )}

          <h2 className="font-serif text-[1.15rem] leading-snug tracking-[-0.02em] text-[color:var(--exp-fg)] sm:text-xl">
            {lesson.title}
          </h2>
          <dl className="mt-4 space-y-3 text-sm leading-relaxed">
            {showSeeing ? (
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
                  Seeing
                </dt>
                <dd className="mt-1 text-[color:var(--exp-fg)]">{lesson.seeing}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
                So what
              </dt>
              <dd className="mt-1 text-[color:var(--exp-muted)]">{lesson.why}</dd>
            </div>
            {lesson.next && !compactTry ? (
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
                  Try
                </dt>
                <dd className="mt-1 text-[color:var(--exp-amber)]">{lesson.next}</dd>
              </div>
            ) : null}
            {lesson.prod ? (
              <details className="group/prod">
                <summary className="cursor-pointer list-none font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)] marker:content-none [&::-webkit-details-marker]:hidden">
                  In production
                  <span className="ml-1.5 normal-case tracking-normal opacity-70 group-open/prod:hidden">
                    · show
                  </span>
                </summary>
                <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--exp-muted)]">
                  {lesson.prod}
                </p>
              </details>
            ) : null}
          </dl>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
