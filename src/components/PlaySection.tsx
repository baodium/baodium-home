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
import {
  DrillPreview,
  previewKindForSlug,
} from "@/components/play/DrillPreview";
import { AmbientField } from "@/components/motion/AmbientField";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Homepage interactive hub — light paper, scroll presence.
 * No deco orbit rings / hover spotlight wow (hub craft owned by sibling overhaul).
 * Previews stay until sibling ships real mini-sims.
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

  const panelY = useTransform(smooth, [0.05, 0.45], reduce ? [0, 0] : [56, 0]);
  const panelScale = useTransform(smooth, [0.08, 0.42], reduce ? [1, 1] : [0.972, 1]);
  const glowY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [48, -56]);
  const headerY = useTransform(smooth, [0.12, 0.55], reduce ? [0, 0] : [22, -6]);
  const railScale = useTransform(smooth, [0.2, 0.55], reduce ? [1, 1] : [0.08, 1]);
  const stageOpacity = useTransform(smooth, [0.18, 0.4], reduce ? [1, 1] : [0.4, 1]);

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
        className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white text-ink shadow-[0_36px_90px_-56px_rgba(26,35,48,0.2)] md:rounded-[3.25rem]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <AmbientField tone="slate" density={14} className="opacity-40 mix-blend-screen" />
          <motion.div
            style={{ y: glowY }}
            className="absolute -left-[18%] top-[-28%] h-[60%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(61,122,140,0.12),transparent)] blur-3xl"
          />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#f4f7fa]/85 to-transparent" />
        </div>

        <div className="relative z-[2] mx-auto w-full max-w-[84rem] px-5 py-11 md:px-10 md:py-16">
          <motion.div style={{ y: headerY }} className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="kicker text-cinnabar">Play · Interactive hub</p>
              <h2
                id="play-heading"
                className="mt-5 font-serif text-[clamp(2.15rem,4.6vw,3.75rem)] leading-[1.02] tracking-[-0.035em] text-ink"
              >
                Run the failure, then name what you saw.
              </h2>
              <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-muted">
                Reliability drills from the book — surges, cascades, stampedes.
                Each one walks a concrete failure, then names what you just saw.
              </p>
            </div>
            <Link
              href="/play"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/15 bg-[#f7fafb] px-6 text-[0.92rem] text-ink transition-[border-color,background-color] duration-300 hover:border-cinnabar/45 hover:bg-white"
            >
              Browse the hub
              <span aria-hidden="true">↗</span>
            </Link>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: railScale }}
            className="mt-8 h-px origin-left bg-gradient-to-r from-cinnabar/40 via-signal/25 to-transparent md:mt-10"
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
                    index === 0
                      ? "lg:col-span-7"
                      : index === 1
                        ? "lg:col-span-5"
                        : index === 2
                          ? "lg:col-span-5"
                          : "lg:col-span-7"
                  }
                >
                  <DrillBand
                    game={game}
                    index={index + 1}
                    progress={smooth}
                    reduce={reduce}
                    mirrored={index % 2 === 1}
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
  const copyY = useTransform(progress, [0.28, 0.72], reduce ? [0, 0] : [36, 0]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.65, ease }}
    >
      <Link
        href={`/play/${game.slug}`}
        className="group relative grid overflow-hidden rounded-[1.5rem] border border-ink/12 bg-[#fbfcfe] transition-[border-color,box-shadow] duration-300 hover:border-cinnabar/35 hover:shadow-[0_24px_56px_-40px_rgba(26,35,48,0.28)] md:grid-cols-12 md:rounded-[2rem]"
      >
        <motion.div
          style={{ y: previewY }}
          className="relative z-[1] flex min-h-[11rem] items-center justify-center border-b border-ink/8 bg-[#f0f5f6] p-5 md:col-span-5 md:min-h-[16rem] md:border-b-0 md:border-r md:p-8"
        >
          <div className="h-28 w-full max-w-sm md:h-36">
            <DrillPreview kind={previewKindForSlug(game.slug)} tone="paper" />
          </div>
          <span className="absolute left-5 top-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">
            Featured · 01
          </span>
        </motion.div>

        <motion.div style={{ y: copyY }} className="relative z-[1] flex flex-col justify-center p-5 md:col-span-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">
            <span className="text-cinnabar">{difficultyLabel(game.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <span className="mt-3 font-serif text-[clamp(1.85rem,3vw,2.55rem)] leading-[1.05] tracking-[-0.03em] text-ink">
            {game.title}
          </span>
          <span className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-muted">
            {game.feel}
          </span>
          <span className="mt-5 max-w-lg border-l-2 border-signal/45 pl-4 text-[0.92rem] leading-relaxed text-ink/80">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-tide">
              Notice
            </span>
            <span className="mt-1.5 block">{game.notice}</span>
          </span>
          <span className="mt-3 max-w-lg text-[0.86rem] leading-relaxed text-muted">
            <span className="font-medium text-ink">Success — </span>
            {game.success}
          </span>
          <span className="mt-6 inline-flex items-center gap-2 text-[0.9rem] text-cinnabar transition-transform duration-300 group-hover:translate-x-1">
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
  mirrored,
  accent,
}: {
  game: PlayGame;
  index: number;
  progress: MotionValue<number>;
  reduce: boolean;
  mirrored: boolean;
  accent: boolean;
}) {
  const start = 0.3 + index * 0.05;
  const y = useTransform(
    progress,
    [start, Math.min(start + 0.35, 0.95)],
    reduce ? [0, 0] : [32 + index * 5, 0],
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
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
          className={`relative z-[1] flex min-h-[7.5rem] flex-[0.9] items-center justify-center border-ink/8 p-4 sm:min-h-0 sm:border-0 sm:p-5 ${
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
          <span className="font-serif text-[1.35rem] leading-tight tracking-[-0.02em] text-ink md:text-[1.5rem]">
            {game.title}
          </span>
          <span className="text-[0.9rem] leading-relaxed text-muted">{game.feel}</span>
          <span className="mt-1 text-[0.82rem] leading-relaxed text-ink/70">
            <span className="text-tide">Notice — </span>
            {game.notice}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
