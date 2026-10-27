"use client";

import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import {
  DrillPreview,
  previewKindForSlug,
} from "@/components/play/DrillPreview";
import { useTilt } from "@/components/motion/useTilt";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

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
  const glowY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [50, -60]);
  const rail = useTransform(smooth, [0.15, 0.45], reduce ? [1, 1] : [0.1, 1]);
  const [featured, ...rest] = playGames;

  return (
    <div ref={ref} className="shell">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-ember px-5 py-11 text-cream shadow-[0_50px_110px_-52px_rgba(30,12,6,0.7)] md:rounded-[3.25rem] md:px-10 md:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <motion.div
            style={{ y: glowY }}
            className="absolute -left-[18%] top-[-28%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.36),transparent)] blur-3xl"
          />
          <div className="absolute bottom-[-34%] right-[-14%] h-[64%] w-[54%] rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.4),transparent)] blur-3xl" />
          {!reduce ? (
            <>
              <div className="play-orbit absolute right-[14%] top-[14%] h-28 w-28 rounded-full border border-amber/20" />
              <div className="play-orbit-slow absolute right-[11%] top-[11%] h-40 w-40 rounded-full border border-white/6" />
            </>
          ) : null}
          <motion.div
            animate={reduce ? undefined : { x: ["-12%", "12%", "-12%"] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-x-[8%] top-[14%] h-px bg-gradient-to-r from-transparent via-amber/50 to-transparent"
          />
        </div>

        <div className="relative z-[2]">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            <p className="kicker inline-flex items-center gap-2.5 text-amber">
              <span aria-hidden="true" className="play-cue relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-amber" />
                <span className="play-cue-ring absolute inset-0 rounded-full bg-amber" />
              </span>
              Play · Interactive hub
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,5.8vw,4.25rem)] leading-[1.01] tracking-[-0.04em]">
              Pick a drill.{" "}
              <em className="text-flame not-italic md:italic">Feel</em> the
              failure mode.
            </h1>
            <p className="mt-5 max-w-xl text-[1.08rem] leading-relaxed text-cream/72">
              Reliability drills from{" "}
              <em className="text-cream">Practical System Design</em>. Each one
              teaches a failure you can feel — then name — before the lecture.
            </p>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: rail }}
            className="mt-9 h-px origin-left bg-gradient-to-r from-amber/55 via-amber/20 to-transparent"
          />

          <div className="mt-9 space-y-4 md:mt-11 md:space-y-5">
            {featured ? (
              <HubFeatured game={featured} reduce={reduce} />
            ) : null}
            <ul className="grid gap-4 lg:grid-cols-12 lg:gap-5">
              {rest.map((game, index) => (
                <li
                  key={game.slug}
                  className={
                    index % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5"
                  }
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
  const { rotateX, rotateY, handlers } = useTilt(4);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: reduce ? 0 : 0.12, ease }}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      {...handlers}
    >
      <Link
        href={`/play/${game.slug}`}
        className="group relative grid overflow-hidden rounded-[1.5rem] border border-white/14 bg-gradient-to-br from-night/55 via-night/35 to-cinnabar/15 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)] transition-[border-color,box-shadow] duration-500 hover:border-amber/45 md:grid-cols-12 md:rounded-[2rem]"
      >
        <span aria-hidden="true" className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative z-[1] flex min-h-[12rem] items-center justify-center border-b border-white/10 bg-black/25 p-6 md:col-span-5 md:min-h-[17rem] md:border-b-0 md:border-r md:p-9">
          <div className="h-32 w-full max-w-sm md:h-40">
            <DrillPreview kind={previewKindForSlug(game.slug)} />
          </div>
          <span className="absolute left-5 top-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-amber/80">
            Featured · 01
          </span>
        </div>
        <div className="relative z-[1] flex flex-col justify-center p-6 md:col-span-7 md:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-cream/45">
            <span className="text-amber">{difficultyLabel(game.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.03em]">
            {game.title}
          </h2>
          <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-cream/70">
            {game.feel}
          </p>
          <p className="mt-5 max-w-lg border-l-2 border-amber/45 pl-4 text-[0.95rem] leading-relaxed text-cream/78">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-amber">
              Notice
            </span>
            <span className="mt-1.5 block">{game.notice}</span>
          </p>
          <span className="mt-7 inline-flex items-center gap-2 text-[0.92rem] text-amber transition-transform duration-300 group-hover:translate-x-1">
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
  const { rotateX, rotateY, handlers } = useTilt(5);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: reduce ? 0 : 0.16 + index * 0.06,
        ease,
      }}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      {...handlers}
      className="h-full"
    >
      <Link
        href={`/play/${game.slug}`}
        className={`group relative flex h-full overflow-hidden border bg-night/40 shadow-[0_22px_50px_-34px_rgba(0,0,0,0.8)] transition-[border-color,background-color,box-shadow] duration-450 hover:bg-night/55 ${
          accent
            ? "border-cinnabar/35 hover:border-cinnabar/55"
            : "border-white/12 hover:border-amber/40"
        } ${mirrored ? "flex-col-reverse sm:flex-row-reverse" : "flex-col sm:flex-row"} rounded-[1.15rem] md:rounded-[1.4rem]`}
      >
        <span aria-hidden="true" className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {accent ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cinnabar via-amber to-transparent"
          />
        ) : null}
        <div className="relative z-[1] flex min-h-[8rem] flex-[0.9] items-center justify-center bg-black/25 p-4 sm:min-h-0 sm:p-5">
          <div className="h-16 w-full max-w-[11rem] sm:h-20">
            <DrillPreview kind={previewKindForSlug(game.slug)} />
          </div>
          <span className="absolute left-3 top-3 font-mono text-[0.62rem] tracking-[0.16em] text-cream/40">
            0{index + 1}
          </span>
        </div>
        <div className="relative z-[1] flex flex-[1.25] flex-col justify-center gap-2 p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] text-cream/45">
            <span className={accent ? "text-cinnabar" : "text-amber"}>
              {difficultyLabel(game.difficulty)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <h2 className="font-serif text-[1.4rem] leading-tight tracking-[-0.02em] md:text-[1.55rem]">
            {game.title}
          </h2>
          <p className="text-[0.92rem] leading-relaxed text-cream/65">
            {game.feel}
          </p>
          <p className="text-[0.84rem] leading-relaxed text-cream/55">
            <span className="text-amber/85">Notice — </span>
            {game.notice}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
