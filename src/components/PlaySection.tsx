"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Reveal } from "@/components/motion/Reveal";
import {
  difficultyLabel,
  playGames,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Play stage: multi-game hub teaser — copper/cream Baodium craft.
 */
export function PlaySection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -50]);
  const panelY = useTransform(scrollYProgress, [0.15, 0.7], reduce ? [0, 0] : [28, 0]);

  return (
    <section
      ref={ref}
      id="play"
      aria-labelledby="play-heading"
      className="relative bg-cream px-3 pb-14 pt-6 text-ink md:px-5 md:pb-20"
    >
      <Reveal y={16}>
        <motion.div
          style={{ y: panelY }}
          className="grain relative overflow-hidden rounded-[2rem] bg-ember px-5 py-10 text-cream md:rounded-[3rem] md:px-10 md:py-14"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <motion.div
              style={{ y: glowY }}
              className="absolute -left-[20%] top-[-30%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.28),transparent)] blur-3xl"
            />
            <div className="absolute bottom-[-35%] right-[-15%] h-[65%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.32),transparent)] blur-3xl" />
            <div className="absolute inset-x-[12%] top-[18%] h-px bg-gradient-to-r from-transparent via-amber/35 to-transparent" />
          </div>

          <div className="relative z-[2] mx-auto w-full max-w-[84rem]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="kicker inline-flex items-center gap-2.5 text-amber">
                  <span
                    aria-hidden="true"
                    className="play-cue relative inline-flex h-2 w-2"
                  >
                    <span className="absolute inset-0 rounded-full bg-amber" />
                    <span className="play-cue-ring absolute inset-0 rounded-full bg-amber" />
                  </span>
                  Play · Games
                </p>
                <h2
                  id="play-heading"
                  className="mt-4 max-w-2xl font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.03em]"
                >
                  Feel the failure mode.
                </h2>
                <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-cream/72">
                  SLO Watch, traffic surges, cascades, cache stampedes — short drills
                  from the book. Pick one and learn by doing.
                </p>
              </div>
              <Link
                href="/play"
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[0.9rem] text-cream/80 transition-colors hover:border-amber/50 hover:text-cream"
              >
                Open play hub
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  ↗
                </span>
              </Link>
            </div>

            <ul className="slo-game mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playGames.map((game, index) => (
                <motion.li
                  key={game.slug}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px 10% 0px" }}
                  transition={{
                    duration: reduce ? 0 : 0.5,
                    delay: reduce ? 0 : 0.06 + index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    href={`/play/${game.slug}`}
                    className="group flex h-full flex-col border border-white/12 bg-night/35 p-4 transition-[border-color,background,transform] duration-300 hover:border-amber/40 hover:bg-night/50 hover:-translate-y-0.5 md:p-5"
                  >
                    <span className="text-[0.68rem] uppercase tracking-[0.16em] text-cream/45">
                      {difficultyLabel(game.difficulty)} · {game.minutes}
                    </span>
                    <span className="mt-3 font-serif text-xl tracking-[-0.02em] text-cream">
                      {game.title}
                    </span>
                    <span className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-cream/65">
                      {game.feel}
                    </span>
                    <span className="mt-4 text-[0.85rem] text-amber transition-transform duration-300 group-hover:translate-x-0.5">
                      Enter →
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </Reveal>
    </section>
  );
}
