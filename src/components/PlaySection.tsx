"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { SloWatchGame } from "@/components/SloWatchGame";
import { Reveal } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Play stage: layered ember composition (depth + soft parallax), Baodium copper/cream.
 * Polish cues from frvky.online / oyin.design — composition and motion only, not branding.
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
          {/* Layered atmosphere — warm fields, not purple glow */}
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
                <p className="kicker text-amber">Play · SLO Watch</p>
                <h2
                  id="play-heading"
                  className="mt-4 max-w-2xl font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.03em]"
                >
                  Keep checkout inside the SLO.
                </h2>
                <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-cream/72">
                  A reliability game from the book — size the pool, survive the spike, then read the
                  chapter that teaches what just happened.
                </p>
              </div>
              <Link
                href="/play"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[0.9rem] text-cream/80 transition-colors hover:border-amber/50 hover:text-cream"
              >
                Open full stage
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="mt-8">
              <SloWatchGame embedded />
            </div>
          </div>
        </motion.div>
      </Reveal>
    </section>
  );
}
