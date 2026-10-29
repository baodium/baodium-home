"use client";

import Link from "next/link";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";
import { DrillPreview } from "@/components/play/DrillPreview";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Homepage Drills strip — light paper stage, live previews, thin copy.
 * No decorative orbits or constellation fields.
 */
export function PlaySection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: reduce ? 400 : 90,
    damping: reduce ? 40 : 28,
    mass: 0.45,
  });

  const panelY = useTransform(smooth, [0.05, 0.45], reduce ? [0, 0] : [64, 0]);
  const panelScale = useTransform(smooth, [0.08, 0.42], reduce ? [1, 1] : [0.965, 1]);
  const headerY = useTransform(smooth, [0.12, 0.55], reduce ? [0, 0] : [28, -8]);
  const railScale = useTransform(smooth, [0.2, 0.55], reduce ? [1, 1] : [0.08, 1]);
  const stageOpacity = useTransform(smooth, [0.18, 0.4], reduce ? [1, 1] : [0.35, 1]);

  const [featured, ...rest] = playGames;

  return (
    <section
      ref={ref}
      id="play"
      aria-labelledby="play-heading"
      className="relative bg-cream px-3 pb-16 pt-8 text-ink md:px-5 md:pb-24 md:pt-10"
    >
      <motion.div
        style={{ y: panelY, scale: panelScale }}
        className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white text-ink shadow-[0_40px_100px_-56px_rgba(26,35,48,0.18)] md:rounded-[3.25rem]"
      >
        <div className="relative z-[2] mx-auto w-full max-w-[84rem] px-5 py-11 md:px-10 md:py-16">
          <motion.div style={{ y: headerY }} className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="kicker inline-flex items-center gap-2.5 text-[color:var(--tide)]">
                <span aria-hidden="true" className="play-cue relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-[color:var(--tide)]" />
                  <span className="play-cue-ring absolute inset-0 rounded-full bg-[color:var(--tide)]" />
                </span>
                Drills
              </p>
              <h2
                id="play-heading"
                className="mt-5 font-serif text-[clamp(2.15rem,4.6vw,3.6rem)] leading-[1.02] tracking-[-0.035em] text-ink"
              >
                Reliability drills from the book.
              </h2>
              <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-muted">
                Run a short SRE drill yourself. Set the levers, watch the meters,
                and leave with a production takeaway.
              </p>
            </div>
            <Link
              href="/play"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full border border-[color-mix(in_srgb,#3d7a8c_35%,transparent)] bg-[#f3f7fa] px-6 text-[0.92rem] text-ink transition-[border-color,background-color] duration-300 hover:border-[color-mix(in_srgb,#3d7a8c_55%,transparent)] hover:bg-white"
            >
              <span>All drills</span>
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                ↗
              </span>
            </Link>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: railScale }}
            className="mt-8 h-px origin-left bg-[color-mix(in_srgb,#3d7a8c_55%,transparent)] md:mt-10"
          />

          <motion.div style={{ opacity: stageOpacity }} className="mt-9 space-y-4 md:mt-11 md:space-y-5">
            {featured ? (
              <FeaturedDrill game={featured} progress={smooth} reduce={reduce} />
            ) : null}

            <ul className="grid gap-4 lg:grid-cols-12 lg:gap-5">
              {rest.map((game, index) => (
                <li
                  key={game.slug}
                  className={
                    index % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5"
                  }
                >
                  <DrillBand
                    game={game}
                    index={index + 1}
                    progress={smooth}
                    reduce={reduce}
                    accent={game.difficulty === "spicy"}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function FeaturedDrill({
  game,
  progress,
  reduce,
}: {
  game: PlayGame;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const previewY = useTransform(progress, [0.25, 0.7], reduce ? [0, 0] : [28, -8]);
  const copyY = useTransform(progress, [0.28, 0.72], reduce ? [0, 0] : [40, 0]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.7, ease }}
    >
      <Link
        href={`/play/${game.slug}`}
        className="group relative grid overflow-hidden rounded-[1.5rem] border border-ink/12 bg-[#fbfcfe] no-underline transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,#3d7a8c_45%,transparent)] hover:shadow-[0_28px_64px_-40px_rgba(26,35,48,0.26)] md:grid-cols-12 md:rounded-[2rem] [&_*]:no-underline"
      >
        <motion.div
          style={{ y: previewY }}
          className="relative z-[1] border-b border-ink/8 bg-[#f3f7fa] p-5 md:col-span-5 md:border-b-0 md:border-r md:p-7"
        >
          <span className="mb-3 block font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[color-mix(in_srgb,#3d7a8c_85%,#1a2330)]">
            Featured · 01
          </span>
          <div className="h-[10.5rem] md:h-[13.5rem]">
            <DrillPreview game={game} size="lg" />
          </div>
        </motion.div>

        <motion.div style={{ y: copyY }} className="relative z-[1] flex flex-col justify-center p-5 md:col-span-7 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">
            <span className="text-cinnabar">{difficultyLabel(game.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <span className="mt-3 font-serif text-[clamp(1.85rem,3vw,2.45rem)] leading-[1.05] tracking-[-0.03em] text-ink">
            {game.title}
          </span>
          <span className="mt-3 max-w-xl font-serif text-[1.12rem] leading-snug tracking-[-0.01em] text-ink">
            {game.challenge}
          </span>
          <span className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-muted">
            {game.feel}
          </span>
          <span className="mt-4 max-w-xl border-t border-ink/8 pt-4 text-[0.9rem] leading-relaxed text-ink/75">
            {game.takeaway}
          </span>
          <span className="mt-6 inline-flex items-center gap-2 text-[0.9rem] text-[color-mix(in_srgb,#3d7a8c_95%,#1a2330)] transition-transform duration-300 group-hover:translate-x-1">
            Run this drill
            <span aria-hidden="true">→</span>
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function DrillBand({
  game,
  index,
  progress,
  reduce,
  accent,
}: {
  game: PlayGame;
  index: number;
  progress: MotionValue<number>;
  reduce: boolean;
  accent: boolean;
}) {
  const start = 0.3 + index * 0.05;
  const y = useTransform(
    progress,
    [start, Math.min(start + 0.35, 0.95)],
    reduce ? [0, 0] : [36 + index * 5, 0],
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 10% 0px" }}
      transition={{
        duration: reduce ? 0 : 0.55,
        delay: reduce ? 0 : 0.04 + index * 0.04,
        ease,
      }}
      style={{ y }}
      className="h-full"
    >
      <Link
        href={`/play/${game.slug}`}
        className={`group relative flex h-full flex-col overflow-hidden border bg-[#fbfcfe] no-underline transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-34px_rgba(26,35,48,0.24)] sm:flex-row [&_*]:no-underline ${
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
          className={`relative z-[1] flex min-h-[8.5rem] flex-[0.95] flex-col justify-center border-b border-ink/8 p-3.5 sm:min-h-0 sm:border-b-0 sm:border-r sm:p-4 ${
            accent ? "bg-[color-mix(in_srgb,var(--cinnabar)_6%,#f3f7fa)]" : "bg-[#f3f7fa]"
          }`}
        >
          <span className="mb-2 font-mono text-[0.58rem] tracking-[0.16em] text-muted">
            0{index + 1}
          </span>
          <div className="h-[6.75rem] w-full sm:h-[7.75rem]">
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
          <span className="font-serif text-[1.35rem] leading-tight tracking-[-0.02em] text-ink md:text-[1.45rem]">
            {game.title}
          </span>
          <span className="text-[0.95rem] leading-snug text-ink">{game.challenge}</span>
          <span className="text-[0.9rem] leading-relaxed text-muted">{game.feel}</span>
        </div>
      </Link>
    </motion.div>
  );
}
