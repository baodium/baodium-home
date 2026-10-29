"use client";

import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { DrillPreview } from "@/components/play/DrillPreview";
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
  const rail = useTransform(smooth, [0.15, 0.45], reduce ? [1, 1] : [0.1, 1]);
  const [featured, ...rest] = playGames;

  return (
    <div ref={ref} className="shell">
      <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white text-ink shadow-[0_40px_90px_-56px_rgba(26,35,48,0.18)] md:rounded-[3.25rem]">
        <div className="relative z-[2] px-5 py-11 md:px-10 md:py-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            <p className="kicker inline-flex items-center gap-2.5 text-[color:var(--tide)]">
              <span
                aria-hidden="true"
                className="play-cue relative inline-flex h-2 w-2"
              >
                <span className="absolute inset-0 rounded-full bg-[color:var(--tide)]" />
                <span className="play-cue-ring absolute inset-0 rounded-full bg-[color:var(--tide)]" />
              </span>
              Drills
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-[clamp(2.4rem,5.6vw,4rem)] leading-[1.02] tracking-[-0.04em] text-ink">
              Reliability drills from the book.
            </h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">
              Short SRE drills from{" "}
              <em className="text-ink">Practical System Design</em>. Each one
              opens with a clear challenge, explains the metrics in plain
              English, then lets you operate the levers yourself.
            </p>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: rail }}
            className="mt-9 h-px origin-left bg-[color-mix(in_srgb,#3d7a8c_55%,transparent)]"
          />

          <div className="mt-9 space-y-4 md:mt-11 md:space-y-5">
            {featured ? <HubFeatured game={featured} reduce={reduce} /> : null}
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
      transition={{ duration: 0.7, delay: reduce ? 0 : 0.1, ease }}
    >
      <Link
        href={`/play/${game.slug}`}
        className="group relative grid overflow-hidden rounded-[1.5rem] border border-ink/12 bg-[#fbfcfe] no-underline transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,#3d7a8c_45%,transparent)] hover:shadow-[0_28px_64px_-40px_rgba(26,35,48,0.28)] md:grid-cols-12 md:rounded-[2rem] [&_*]:no-underline"
      >
        <div className="relative z-[1] border-b border-ink/8 bg-[#f3f7fa] p-5 md:col-span-5 md:border-b-0 md:border-r md:p-7">
          <span className="mb-3 block font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[color-mix(in_srgb,#3d7a8c_85%,#1a2330)]">
            Featured · 01
          </span>
          <div className="h-[11.5rem] md:h-[14.5rem]">
            <DrillPreview game={game} size="lg" />
          </div>
        </div>
        <div className="relative z-[1] flex flex-col justify-center p-6 md:col-span-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">
            <span className="text-cinnabar">{difficultyLabel(game.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
            <span aria-hidden="true">·</span>
            <span>{game.chapterLabel}</span>
          </div>
          <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.05] tracking-[-0.03em] text-ink">
            {game.title}
          </h2>
          <p className="mt-3 max-w-xl font-serif text-[1.15rem] leading-snug tracking-[-0.01em] text-ink">
            {game.challenge}
          </p>
          <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-muted">
            {game.feel}
          </p>
          <p className="mt-4 max-w-xl border-t border-ink/8 pt-4 text-[0.92rem] leading-relaxed text-ink/75">
            {game.takeaway}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-[0.92rem] text-[color-mix(in_srgb,#3d7a8c_95%,#1a2330)] transition-transform duration-300 group-hover:translate-x-1">
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
  accent,
}: {
  game: PlayGame;
  index: number;
  reduce: boolean;
  accent: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: reduce ? 0 : 0.14 + index * 0.05,
        ease,
      }}
      className="h-full"
    >
      <Link
        href={`/play/${game.slug}`}
        className={`group relative flex h-full flex-col overflow-hidden border bg-[#fbfcfe] no-underline transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-34px_rgba(26,35,48,0.26)] sm:flex-row [&_*]:no-underline ${
          accent
            ? "border-cinnabar/30 hover:border-cinnabar/50"
            : "border-ink/10 hover:border-[color-mix(in_srgb,#3d7a8c_40%,transparent)]"
        } rounded-[1.15rem] md:rounded-[1.4rem]`}
      >
        {accent ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cinnabar"
          />
        ) : null}
        <div
          className={`relative z-[1] flex min-h-[9rem] flex-[0.95] flex-col justify-center border-b border-ink/8 p-3.5 sm:min-h-0 sm:border-b-0 sm:border-r sm:p-4 ${
            accent ? "bg-[color-mix(in_srgb,var(--cinnabar)_6%,#f3f7fa)]" : "bg-[#f3f7fa]"
          }`}
        >
          <span className="mb-2 font-mono text-[0.58rem] tracking-[0.16em] text-muted">
            0{index + 1}
          </span>
          <div className="h-[7.25rem] w-full sm:h-[8.5rem]">
            <DrillPreview game={game} size="sm" />
          </div>
        </div>
        <div className="relative z-[1] flex flex-[1.2] flex-col justify-center gap-2 p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] text-muted">
            <span
              className={
                accent
                  ? "text-cinnabar"
                  : "text-[color-mix(in_srgb,#3d7a8c_90%,#1a2330)]"
              }
            >
              {difficultyLabel(game.difficulty)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <h2 className="font-serif text-[1.35rem] leading-tight tracking-[-0.02em] text-ink md:text-[1.5rem]">
            {game.title}
          </h2>
          <p className="text-[0.95rem] leading-snug text-ink">{game.challenge}</p>
          <p className="text-[0.9rem] leading-relaxed text-muted">{game.feel}</p>
        </div>
      </Link>
    </motion.div>
  );
}
