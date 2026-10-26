"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  difficultyLabel,
  playGames,
  type PlayGame,
} from "@/data/play-games";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

function GameCard({
  game,
  index,
  reduce,
}: {
  game: PlayGame;
  index: number;
  reduce: boolean;
}) {
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: reduce ? 0 : 0.08 + index * 0.07, ease }}
      className="group relative flex flex-col border border-white/12 bg-night/40 p-5 transition-[border-color,transform,background] duration-300 hover:border-amber/45 hover:bg-night/55 md:p-6"
    >
      <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-cream/45">
        <span className="text-amber">{difficultyLabel(game.difficulty)}</span>
        <span aria-hidden="true">·</span>
        <span>{game.minutes}</span>
      </div>
      <h2 className="mt-4 font-serif text-[1.65rem] leading-tight tracking-[-0.02em] text-cream md:text-[1.85rem]">
        {game.title}
      </h2>
      <p className="mt-3 flex-1 text-[0.98rem] leading-relaxed text-cream/68">
        {game.feel}
      </p>
      <Link
        href={`/play/${game.slug}`}
        className="slo-btn-primary mt-6 self-start"
      >
        Enter
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </motion.article>
  );
}

export function PlayHub() {
  const reduce = usePrefersReducedMotion();

  return (
    <div className="shell">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-ember px-5 py-10 text-cream md:rounded-[3rem] md:px-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <motion.div
            animate={
              reduce
                ? undefined
                : { opacity: [0.55, 0.85, 0.55], scale: [1, 1.04, 1] }
            }
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-[18%] top-[-28%] h-[65%] w-[65%] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.3),transparent)] blur-3xl"
          />
          <div className="absolute bottom-[-32%] right-[-12%] h-[60%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.34),transparent)] blur-3xl" />
          <motion.div
            animate={reduce ? undefined : { x: ["-8%", "8%", "-8%"] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-x-[10%] top-[16%] h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent"
          />
        </div>

        <div className="relative z-[2]">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <p className="kicker text-amber">Play · Baodium</p>
            <h1 className="mt-4 max-w-3xl font-serif text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.02] tracking-[-0.035em]">
              Pick a game. Feel the failure mode.
            </h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-cream/72">
              Short reliability drills from{" "}
              <em className="text-cream">Practical System Design</em> — traffic,
              SLOs, cascades, caches. No lecture first; learn by doing.
            </p>
          </motion.div>

          <div className="slo-game mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {playGames.map((game, index) => (
              <GameCard
                key={game.slug}
                game={game}
                index={index}
                reduce={reduce}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
