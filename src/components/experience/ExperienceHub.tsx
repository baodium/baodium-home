"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { experienceChapters } from "@/lib/experience/scenarios";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

export function ExperienceHub() {
  const reduced = usePrefersReducedMotion();
  const [featured, ...rest] = experienceChapters;

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
          className="mt-3 text-balance font-serif text-[clamp(2.1rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[color:var(--exp-fg)]"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : 0.04, ease }}
        >
          Operate the chapter
        </motion.h1>
        <motion.p
          className="mt-4 text-lg leading-relaxed text-[color:var(--exp-muted)]"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.08, ease }}
        >
          The book has the reasoning. A lab is the same incident with the numbers
          moving: guided first, then the controls on their own, then a result you
          have to earn. Other chapters stay on the page until there is a lab that
          can carry them.
        </motion.p>
      </header>

      {featured ? (
        <motion.div
          className="mt-12"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.1, ease }}
        >
          <Link
            href={`/system-design/experience/${featured.slug}`}
            className="lift-card group grid gap-6 overflow-hidden border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] p-6 hover:border-[color-mix(in_srgb,var(--exp-accent)_40%,transparent)] sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10"
          >
            <p className="font-serif text-[clamp(3rem,6vw,4.5rem)] leading-none tracking-[-0.04em] text-[color:var(--exp-faint)]">
              {String(featured.number).padStart(2, "0")}
            </p>
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--exp-faint)]">
                Start here · {featured.durationMin} min
              </p>
              <h2 className="mt-2 font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-tight text-[color:var(--exp-fg)] transition-colors group-hover:text-[color:var(--exp-accent-text)]">
                {featured.title}
              </h2>
              <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-[color:var(--exp-muted)]">
                {featured.subtitle}
              </p>
              <p className="mt-5 inline-flex items-center gap-2 text-[0.95rem] text-[color:var(--exp-accent-text)]">
                Open Chapter 1
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </p>
            </div>
          </Link>
        </motion.div>
      ) : null}

      <ol className="mt-6 divide-y divide-[color:var(--exp-line)] border-y border-[color:var(--exp-line)]">
        {rest.map((chapter, index) => {
          const ready = chapter.status === "ready";
          const href = ready ? `/system-design/experience/${chapter.slug}` : chapter.bookHref;
          return (
            <motion.li
              key={chapter.id}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.4,
                delay: reduced ? 0 : 0.12 + index * 0.03,
                ease,
              }}
            >
              <Link
                href={href}
                className="group grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-xl px-2 py-4 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--exp-fg)_4%,transparent)] sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-6 sm:py-5"
              >
                <span className="font-mono text-sm tabular-nums text-[color:var(--exp-faint)]">
                  {String(chapter.number).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-serif text-xl text-[color:var(--exp-fg)] transition-colors group-hover:text-[color:var(--exp-accent-text)]">
                    {chapter.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-[color:var(--exp-muted)]">
                    {chapter.subtitle}
                  </span>
                </span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
                  {ready ? `${chapter.durationMin} min` : "Read"}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
