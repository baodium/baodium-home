"use client";

import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import {
  DrillPreview,
  previewKindForSlug,
} from "@/components/play/DrillPreview";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Play hub listings — light paper, scroll rail.
 * No deco orbit rings / hover-spotlight wow.
 * Real mini-sim previews + so-what debriefs: sibling BAO-36 owns that rewrite.
 */
export function PlayHub() {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: reduce ? 400 : 95,
    damping: reduce ? 40 : 28,
    mass: 0.4,
  });
  const glowY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [36, -40]);
  const rail = useTransform(smooth, [0.15, 0.45], reduce ? [1, 1] : [0.1, 1]);
  const [featured, ...rest] = playGames;

  return (
    <div ref={ref} className="shell">
      <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white text-ink shadow-[0_36px_80px_-56px_rgba(26,35,48,0.18)] md:rounded-[3.25rem]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <motion.div
            style={{ y: glowY }}
            className="absolute -left-[16%] top-[-26%] h-[58%] w-[58%] rounded-full bg-[radial-gradient(closest-side,rgba(61,122,140,0.12),transparent)] blur-3xl"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f4f7fa]/90 to-transparent" />
        </div>

        <div className="relative z-[2] px-5 py-11 md:px-10 md:py-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            <p className="kicker text-tide">Play · Interactive hub</p>
            <h1 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,5.8vw,4.25rem)] leading-[1.01] tracking-[-0.04em] text-ink">
              Pick a drill. Run the failure, then name what you saw.
            </h1>
            <p className="mt-5 max-w-xl text-[1.08rem] leading-relaxed text-muted">
              Reliability drills from{" "}
              <em className="text-ink">Practical System Design</em>. Each one
              walks a concrete failure — then names what you just saw — before
              the chapter lecture.
            </p>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: rail }}
            className="mt-9 h-px origin-left bg-gradient-to-r from-cinnabar/45 via-tide/30 to-transparent"
          />

          <div className="mt-9 space-y-4 md:mt-11 md:space-y-5">
            {featured ? <HubFeatured game={featured} reduce={reduce} /> : null}
            <ul className="grid gap-4 lg:grid-cols-12 lg:gap-5">
              {rest.map((game, index) => (
                <li
                  key={game.slug}
                  className={index % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5"}
                >
                  <HubBand
                    game={game}
                    index={index + 1}
                    reduce={reduce}
                    mirrored={index % 2 === 1}
                    accent={game.difficulty === "spicy"}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function HubFeatured({
  game,
  reduce,
}: {
  game: PlayGame;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: reduce ? 0 : 0.1, ease }}
    >
      <Link
        href={`/play/${game.slug}`}
        className="group relative grid overflow-hidden rounded-[1.5rem] border border-ink/12 bg-[#fbfcfe] transition-[border-color,box-shadow] duration-300 hover:border-cinnabar/35 hover:shadow-[0_24px_56px_-40px_rgba(26,35,48,0.28)] md:grid-cols-12 md:rounded-[2rem]"
      >
        <div className="relative z-[1] flex min-h-[12rem] items-center justify-center border-b border-ink/8 bg-[#f0f5f6] p-6 md:col-span-5 md:min-h-[17rem] md:border-b-0 md:border-r md:p-9">
          <div className="h-32 w-full max-w-sm md:h-40">
            <DrillPreview kind={previewKindForSlug(game.slug)} tone="paper" />
          </div>
          <span className="absolute left-5 top-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">
            Featured · 01
          </span>
        </div>
        <div className="relative z-[1] flex flex-col justify-center p-6 md:col-span-7 md:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">
            <span className="text-cinnabar">{difficultyLabel(game.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.03em] text-ink">
            {game.title}
          </h2>
          <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-muted">
            {game.feel}
          </p>
          <p className="mt-5 max-w-lg border-l-2 border-tide/45 pl-4 text-[0.95rem] leading-relaxed text-ink/80">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-tide">
              Notice
            </span>
            <span className="mt-1.5 block">{game.notice}</span>
          </p>
          <p className="mt-3 max-w-lg text-[0.88rem] leading-relaxed text-muted">
            <span className="font-medium text-ink">Success — </span>
            {game.success}
          </p>
          <span className="mt-7 inline-flex items-center gap-2 text-[0.92rem] text-cinnabar transition-transform duration-300 group-hover:translate-x-1">
            Run this drill
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function HubBand({
  game,
  index,
  reduce,
  mirrored,
  accent,
}: {
  game: PlayGame;
  index: number;
  reduce: boolean;
  mirrored: boolean;
  accent: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: reduce ? 0 : 0.12 + index * 0.05,
        ease,
      }}
      className="h-full"
    >
      <Link
        href={`/play/${game.slug}`}
        className={`group relative flex h-full overflow-hidden border bg-[#f7fafb] transition-[border-color,background-color] duration-300 hover:bg-white ${
          accent
            ? "border-cinnabar/28 hover:border-cinnabar/48"
            : "border-ink/10 hover:border-tide/35"
        } ${mirrored ? "flex-col-reverse sm:flex-row-reverse" : "flex-col sm:flex-row"} rounded-[1.15rem] md:rounded-[1.4rem]`}
      >
        {accent ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cinnabar/70"
          />
        ) : null}
        <div
          className={`relative z-[1] flex min-h-[8rem] flex-[0.9] items-center justify-center p-4 sm:min-h-0 sm:p-5 ${
            accent ? "bg-[color-mix(in_srgb,var(--cinnabar)_6%,#fff)]" : "bg-[#f0f5f6]"
          }`}
        >
          <div className="h-16 w-full max-w-[11rem] sm:h-20">
            <DrillPreview kind={previewKindForSlug(game.slug)} tone="paper" />
          </div>
          <span className="absolute left-3 top-3 font-mono text-[0.62rem] tracking-[0.16em] text-muted">
            0{index + 1}
          </span>
        </div>
        <div className="relative z-[1] flex flex-[1.25] flex-col justify-center gap-2 p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] text-muted">
            <span className={accent ? "text-cinnabar" : "text-tide"}>
              {difficultyLabel(game.difficulty)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <h2 className="font-serif text-[1.4rem] leading-tight tracking-[-0.02em] text-ink md:text-[1.55rem]">
            {game.title}
          </h2>
          <p className="text-[0.92rem] leading-relaxed text-muted">{game.feel}</p>
          <p className="text-[0.84rem] leading-relaxed text-ink/70">
            <span className="text-tide">Notice — </span>
            {game.notice}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
