"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { DrillPreview } from "@/components/play/DrillPreview";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { figureForHref } from "@/lib/learning/chapter-figures";
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
      <div className="stage-sheet relative overflow-hidden border border-ink/10 bg-white text-ink">
        <div className="relative z-[2] px-5 py-11 md:px-10 md:py-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease }}
          >
            <p className="kicker inline-flex items-center gap-2.5 text-[color:var(--drill-kicker,#1b6b62)]">
              <span
                aria-hidden="true"
                className="play-cue relative inline-flex h-2 w-2"
              >
                <span className="absolute inset-0 rounded-full bg-[color:var(--drill-signal,#1b6b62)]" />
                <span className="play-cue-ring absolute inset-0 rounded-full bg-[color:var(--drill-signal,#1b6b62)]" />
              </span>
              Drills
            </p>
            <h1 className="mt-5 max-w-3xl text-balance font-serif text-[clamp(2.4rem,5.6vw,4rem)] leading-[1.02] tracking-[-0.04em] text-ink">
              Reliability drills from the book.
            </h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">
              Short SRE drills from{" "}
              <em className="text-ink">Practical System Design</em>. Each one
              states a measurable challenge, defines the metrics in plain
              English, and lets you change the controls. The{" "}
              <Link href="/system-design/experience" className="text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink/50">
                chapter labs
              </Link>{" "}
              cover the same ideas with a longer incident walkthrough.
            </p>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: rail }}
            className="mt-9 h-px origin-left bg-[color-mix(in_srgb,#1b6b62_55%,transparent)]"
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
        className="lift-card group relative grid overflow-hidden border border-ink/12 bg-[#fbfcfe] no-underline hover:border-[color-mix(in_srgb,#1b6b62_45%,transparent)] md:grid-cols-12 [&_*]:no-underline"
      >
        <div className="relative z-[1] border-b border-ink/8 bg-[#f3f7f5] p-5 md:col-span-5 md:border-b-0 md:border-r md:p-7">
          <span className="mb-3 block font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--drill-kicker,#1b6b62)]">
            Featured · 01
          </span>
          <ChapterFigure href={game.chapterHref} className="mb-3 h-24" />
          <div className="h-[11.5rem] md:h-[14.5rem]">
            <DrillPreview game={game} size="lg" />
          </div>
        </div>
        <div className="relative z-[1] flex flex-col justify-center p-6 md:col-span-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">
            <span className="text-[color:var(--drill-kicker,#1b6b62)]">{difficultyLabel(game.difficulty)}</span>
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
          <span className="mt-6 inline-flex items-center gap-2 text-[0.92rem] text-[color:var(--drill-kicker,#1b6b62)] transition-transform duration-300 group-hover:translate-x-1">
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
        className={`lift-card group relative flex h-full flex-col overflow-hidden border bg-[#fbfcfe] no-underline sm:flex-row [&_*]:no-underline ${
          accent
            ? "border-[color-mix(in_srgb,#1b6b62_35%,transparent)] hover:border-[color-mix(in_srgb,#1b6b62_55%,transparent)]"
            : "border-ink/10 hover:border-[color-mix(in_srgb,#1b6b62_40%,transparent)]"
        }`}
      >
        {accent ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[color:var(--drill-signal,#1b6b62)]"
          />
        ) : null}
        <div
          className={`relative z-[1] flex min-h-[10rem] flex-[0.95] flex-col justify-center border-b border-ink/8 p-4 sm:min-h-0 sm:border-b-0 sm:border-r sm:p-5 ${
            accent ? "bg-[color-mix(in_srgb,#1b6b62_6%,#f3f7f5)]" : "bg-[#f3f7f5]"
          }`}
        >
          <span className="mb-2.5 font-mono text-[0.72rem] tracking-[0.12em] text-muted">
            0{index + 1}
          </span>
          <ChapterFigure href={game.chapterHref} className="mb-2.5 h-16" />
          <div className="h-[7.5rem] w-full sm:h-[9rem]">
            <DrillPreview game={game} size="sm" />
          </div>
        </div>
        <div className="relative z-[1] flex flex-[1.2] flex-col justify-center gap-2.5 p-5 sm:p-6 md:p-7">
          <div className="flex flex-wrap items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] text-muted">
            <span
              className={
                accent
                  ? "text-[color:var(--drill-kicker,#1b6b62)]"
                  : "text-[color-mix(in_srgb,#1b6b62_90%,#18201c)]"
              }
            >
              {difficultyLabel(game.difficulty)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <h2 className="font-serif text-[1.4rem] leading-tight tracking-[-0.02em] text-ink md:text-[1.55rem]">
            {game.title}
          </h2>
          <p className="text-[0.98rem] leading-snug text-ink">{game.challenge}</p>
          <p className="text-[0.92rem] leading-relaxed text-muted">{game.feel}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ChapterFigure({ href, className }: { href: string; className: string }) {
  const figure = figureForHref(href);
  if (!figure) return null;
  return (
    <div className={`chapter-plate relative w-full ${className}`}>
      <Image src={figure.src} alt={figure.alt} fill sizes="360px" className="object-contain p-1.5" />
    </div>
  );
}
