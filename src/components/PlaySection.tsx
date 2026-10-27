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
import { DriftChip } from "@/components/motion/IdleDrift";
import { useTilt } from "@/components/motion/useTilt";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Homepage interactive hub — scroll-driven stage, asymmetric bespoke drills.
 * No identical Enter→ boxes. One hub CTA; cards teach then deep-link.
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
  const glowY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [70, -80]);
  const glow2Y = useTransform(smooth, [0, 1], reduce ? [0, 0] : [-30, 50]);
  const sheenX = useTransform(smooth, [0.15, 0.85], reduce ? ["0%", "0%"] : ["-18%", "22%"]);
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
        className="grain relative overflow-hidden rounded-[2rem] bg-ember text-cream shadow-[0_50px_120px_-56px_rgba(30,12,6,0.75)] md:rounded-[3.25rem]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <AmbientField tone="slate" density={20} className="opacity-50 mix-blend-screen" />
          <motion.div
            style={{ y: glowY }}
            className="absolute -left-[22%] top-[-32%] h-[78%] w-[78%] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.38),transparent)] blur-3xl"
          />
          <motion.div
            style={{ y: glow2Y }}
            className="absolute bottom-[-42%] right-[-22%] h-[78%] w-[62%] rounded-full bg-[radial-gradient(closest-side,rgba(61,122,126,0.38),transparent)] blur-3xl"
          />
          <motion.div
            style={{ x: sheenX }}
            className="absolute inset-x-[6%] top-[11%] h-px bg-gradient-to-r from-transparent via-signal/55 to-transparent"
          />
          {!reduce ? (
            <>
              <motion.div
                animate={{ opacity: [0.25, 0.65, 0.25], scale: [1, 1.08, 1] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[48%] top-[6%] h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(148,168,196,0.28),transparent)] blur-2xl"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2], x: [0, 40, 0], y: [0, -20, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[18%] bottom-[12%] h-36 w-36 rounded-full bg-[radial-gradient(closest-side,rgba(94,168,168,0.3),transparent)] blur-2xl"
              />
              <div className="play-orbit absolute right-[12%] top-[18%] h-24 w-24 rounded-full border border-signal/25" />
              <div className="play-orbit-slow absolute right-[10%] top-[16%] h-32 w-32 rounded-full border border-slate-soft/15" />
              <div className="play-orbit absolute left-[8%] bottom-[22%] h-16 w-16 rounded-full border border-amber/20" />
              <DriftChip
                delay={0.2}
                amp={16}
                className="absolute left-[22%] top-[28%] font-mono text-[0.58rem] uppercase tracking-[0.22em] text-signal/55"
              >
                p99
              </DriftChip>
              <DriftChip
                delay={1.1}
                amp={12}
                className="absolute right-[28%] bottom-[30%] font-mono text-[0.58rem] uppercase tracking-[0.22em] text-amber/50"
              >
                slo
              </DriftChip>
              <span className="absolute inset-x-[10%] top-[42%] h-px overflow-hidden opacity-50">
                <span className="signal-scan block h-full w-1/4 bg-gradient-to-r from-transparent via-signal/70 to-transparent" />
              </span>
            </>
          ) : null}
        </div>

        <div className="relative z-[2] mx-auto w-full max-w-[84rem] px-5 py-11 md:px-10 md:py-16">
          <motion.div style={{ y: headerY }} className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="kicker inline-flex items-center gap-2.5 text-amber">
                <span aria-hidden="true" className="play-cue relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-amber" />
                  <span className="play-cue-ring absolute inset-0 rounded-full bg-amber" />
                </span>
                Play · Interactive hub
              </p>
              <h2
                id="play-heading"
                className="mt-5 font-serif text-[clamp(2.15rem,4.6vw,3.75rem)] leading-[1.02] tracking-[-0.035em]"
              >
                Feel the{" "}
                <em className="text-flame not-italic md:italic">failure mode</em>.
              </h2>
              <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-cream/72">
                Reliability drills from the book — surges, cascades, stampedes.
                Each one teaches a failure you can feel, then name.
              </p>
            </div>
            <Link
              href="/play"
              className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-full border border-amber/40 bg-gradient-to-r from-amber/15 via-amber/10 to-transparent px-6 text-[0.92rem] text-cream shadow-[0_0_0_1px_rgba(222,162,124,0.08)] transition-[border-color,box-shadow,background-color] duration-400 hover:border-amber/70 hover:shadow-[0_0_40px_-10px_rgba(222,162,124,0.55)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/18 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="relative">Browse the hub</span>
              <span aria-hidden="true" className="relative transition-transform duration-300 group-hover:translate-x-0.5">
                ↗
              </span>
            </Link>
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: railScale }}
            className="mt-8 h-px origin-left bg-gradient-to-r from-amber/55 via-amber/20 to-transparent md:mt-10"
          />

          <motion.div style={{ opacity: stageOpacity }} className="mt-9 space-y-4 md:mt-11 md:space-y-5">
            {featured ? (
              <FeaturedDrill
                game={featured}
                progress={smooth}
                reduce={reduce}
              />
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
  const { rotateX, rotateY, handlers } = useTilt(4);
  const previewY = useTransform(progress, [0.25, 0.7], reduce ? [0, 0] : [36, -12]);
  const copyY = useTransform(progress, [0.28, 0.72], reduce ? [0, 0] : [48, 0]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.7, ease }}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      {...handlers}
      className="[perspective:1400px]"
    >
      <Link
        href={`/play/${game.slug}`}
        className="group relative grid overflow-hidden rounded-[1.5rem] border border-white/14 bg-gradient-to-br from-night/55 via-night/35 to-cinnabar/15 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)] transition-[border-color,box-shadow] duration-500 hover:border-amber/45 hover:shadow-[0_40px_90px_-36px_rgba(0,0,0,0.9)] md:grid-cols-12 md:rounded-[2rem]"
      >
        <span aria-hidden="true" className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 top-[-30%] h-[120%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.28),transparent)] blur-2xl"
        />

        <motion.div
          style={{ y: previewY }}
          className="relative z-[1] flex min-h-[11rem] items-center justify-center border-b border-white/10 bg-black/25 p-5 md:col-span-5 md:min-h-[16rem] md:border-b-0 md:border-r md:p-8"
        >
          <div className="h-28 w-full max-w-sm md:h-36">
            <DrillPreview kind={previewKindForSlug(game.slug)} />
          </div>
          <span className="absolute left-5 top-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-amber/80">
            Featured · 01
          </span>
        </motion.div>

        <motion.div style={{ y: copyY }} className="relative z-[1] flex flex-col justify-center p-5 md:col-span-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-cream/45">
            <span className="text-amber">{difficultyLabel(game.difficulty)}</span>
            <span aria-hidden="true">·</span>
            <span>{game.minutes}</span>
          </div>
          <span className="mt-3 font-serif text-[clamp(1.85rem,3vw,2.55rem)] leading-[1.05] tracking-[-0.03em] text-cream">
            {game.title}
          </span>
          <span className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-cream/70">
            {game.feel}
          </span>
          <span className="mt-5 max-w-lg border-l-2 border-amber/45 pl-4 text-[0.92rem] leading-relaxed text-cream/78">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-amber">
              Notice
            </span>
            <span className="mt-1.5 block">{game.notice}</span>
          </span>
          <span className="mt-6 inline-flex items-center gap-2 text-[0.9rem] text-amber transition-transform duration-300 group-hover:translate-x-1">
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
  const { rotateX, rotateY, handlers } = useTilt(5);
  const start = 0.3 + index * 0.05;
  const y = useTransform(
    progress,
    [start, Math.min(start + 0.35, 0.95)],
    reduce ? [0, 0] : [40 + index * 6, 0],
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 10% 0px" }}
      transition={{
        duration: reduce ? 0 : 0.6,
        delay: reduce ? 0 : 0.04 + index * 0.05,
        ease,
      }}
      style={{ y, rotateX, rotateY, transformPerspective: 1200 }}
      {...handlers}
      className="h-full [perspective:1200px]"
    >
      <Link
        href={`/play/${game.slug}`}
        className={`group relative flex h-full overflow-hidden border bg-night/40 shadow-[0_22px_50px_-34px_rgba(0,0,0,0.8)] transition-[border-color,background-color,box-shadow] duration-450 hover:bg-night/55 hover:shadow-[0_32px_64px_-30px_rgba(0,0,0,0.85)] ${
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

        <div className="relative z-[1] flex min-h-[7.5rem] flex-[0.9] items-center justify-center border-white/10 bg-black/25 p-4 sm:min-h-0 sm:border-0 sm:p-5">
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
          <span className="font-serif text-[1.35rem] leading-tight tracking-[-0.02em] text-cream md:text-[1.5rem]">
            {game.title}
          </span>
          <span className="text-[0.9rem] leading-relaxed text-cream/65">
            {game.feel}
          </span>
          <span className="mt-1 text-[0.82rem] leading-relaxed text-cream/55">
            <span className="text-amber/80">Notice — </span>
            {game.notice}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
