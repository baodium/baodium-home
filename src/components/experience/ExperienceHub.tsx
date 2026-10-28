"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { experienceChapters } from "@/lib/experience/scenarios";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

export function ExperienceHub() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <motion.p
          className="exp-kicker"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.4, ease }}
        >
          Practical System Design
        </motion.p>
        <motion.h1
          className="mt-3 font-serif text-[clamp(2.1rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[color:var(--exp-fg)]"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.04, ease }}
        >
          Operate the incident
        </motion.h1>
        <motion.p
          className="mt-4 text-lg leading-relaxed text-[color:var(--exp-muted)]"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.08, ease }}
        >
          Read the book for the reasoning. Run Chapter 1 like an on-call drill: pool.*
          metrics, acquire waits, mitigations, and a kill switch that does not kill
          in-flight work, with live narration that names what you are seeing.
        </motion.p>
        <motion.div
          className="mt-6 flex flex-wrap gap-3"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.45, delay: reduced ? 0 : 0.12, ease }}
        >
          <Link
            href="/system-design/experience/chapter-1"
            className="exp-btn exp-btn-primary !min-h-12 !px-6"
          >
            Start Chapter 1 experience
          </Link>
          <Link href="/system-design" className="exp-btn exp-btn-ghost !min-h-12 !px-6">
            Book overview
          </Link>
          <Link href="/play" className="exp-btn exp-btn-ghost !min-h-12 !px-6">
            Play drills
          </Link>
        </motion.div>
      </header>

      <ol className="mt-14 grid gap-4 sm:grid-cols-2">
        {experienceChapters.map((ch, index) => {
          const ready = ch.status === "ready";
          const href = ready ? `/system-design/experience/${ch.slug}` : ch.bookHref;
          return (
            <motion.li
              key={ch.id}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.5,
                delay: reduced ? 0 : 0.08 + index * 0.05,
                ease,
              }}
            >
              <Link
                href={href}
                className={`group relative block overflow-hidden rounded-[1.15rem] border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] p-5 shadow-[0_18px_40px_-28px_rgba(26,35,48,0.22)] transition-[border-color,transform] duration-300 ${
                  ready
                    ? "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--exp-accent)_40%,transparent)]"
                    : "opacity-75 hover:border-[color:var(--exp-line-strong)]"
                }`}
              >
                {ready ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 h-1 w-12 bg-cinnabar/70 transition-[width] duration-500 group-hover:w-20"
                  />
                ) : null}
                <div className="relative flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--exp-faint)]">
                    Chapter {ch.number}
                  </p>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-amber)]">
                    {ready ? `~${ch.durationMin} min` : "Soon · read prose"}
                  </p>
                </div>
                <h2 className="relative mt-2 font-serif text-xl text-[color:var(--exp-fg)] transition-colors group-hover:text-[color:var(--exp-accent)]">
                  {ch.title}
                </h2>
                <p className="relative mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                  {ch.subtitle}
                </p>
                {ready ? (
                  <p className="relative mt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-accent)]">
                    Guided · ops metrics · mitigations →
                  </p>
                ) : null}
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
