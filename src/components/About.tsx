"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { AlsoStrip } from "@/components/AlsoStrip";
import { Magnetic } from "@/components/Magnetic";
import { Reveal } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { site } from "@/data/site";

/**
 * Founder bridge — intentional hierarchy:
 * identity → one sharp line → research (Scholar once) → contact → quiet Also.
 * No taxonomy chips, no hello@ leftover, no Scholar pile.
 */
export function About() {
  const reduce = usePrefersReducedMotion();
  const bridgeRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: bridgeRef,
    offset: ["start 0.92", "start 0.45"],
  });
  const ruleScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.12, 1]);
  const ruleOpacity = useTransform(scrollYProgress, [0, 0.35, 1], reduce ? [1, 1, 1] : [0.2, 0.85, 1]);

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative overflow-hidden bg-cream pb-16 text-ink md:pb-24"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-18%] top-[8%] h-[42vmax] w-[42vmax] rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.1),transparent)] blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-12%] h-[36vmax] w-[36vmax] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.16),transparent)] blur-3xl" />
      </div>

      <div className="shell relative z-[2]">
        <div ref={bridgeRef} className="pt-14 md:pt-20">
          <Reveal y={12}>
            <p className="kicker text-cinnabar">Founder</p>
            <h2 id="about-heading" className="sr-only">
              Founder
            </h2>
          </Reveal>

          <Reveal y={14} delay={0.04}>
            <p className="mt-6 font-serif text-[clamp(2.15rem,4.6vw,4.25rem)] italic leading-[1.02] tracking-[-0.03em] text-ink">
              {site.credit}
            </p>
          </Reveal>

          <Reveal y={10} delay={0.08}>
            <p className="mt-6 max-w-[36rem] text-[clamp(1.15rem,1.7vw,1.35rem)] leading-relaxed text-ink/85">
              Baodium is his home for shipping products and writing production
              failures into design practice — not a studio pitch deck.
            </p>
          </Reveal>

          {/* Research — deliberate founder credential, not a chip pile */}
          <Reveal y={12} delay={0.1} className="mt-10 md:mt-12">
            <div className="grid gap-6 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] md:gap-10 md:items-end">
              <p className="kicker text-muted">Research</p>
              <div>
                <a
                  href={site.scholar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <span className="text-[clamp(1.35rem,2.2vw,1.85rem)] font-semibold tracking-[-0.03em] text-ink transition-colors group-hover:text-cinnabar">
                    Google Scholar
                  </span>
                  <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-cinnabar">
                    {site.scholarCitations} citations
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 translate-y-0.5 text-cinnabar/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">
                  Misinformation, social platforms, and systems under pressure —
                  the research thread behind the book.
                </p>
              </div>
            </div>
          </Reveal>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: ruleScale, opacity: ruleOpacity }}
            className="mt-10 h-px origin-left bg-gradient-to-r from-cinnabar/55 via-cinnabar/25 to-transparent md:mt-12"
          />

          {/* Contact — deliberate invite, baodium@gmail.com */}
          <Reveal y={12} delay={0.06} className="mt-10 md:mt-12">
            <div className="grid gap-5 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] md:items-center md:gap-10">
              <p className="kicker text-muted">Write Baodium</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Magnetic>
                  <a
                    href={site.email}
                    className="group relative inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-full bg-ember py-2 pl-6 pr-2 text-[0.95rem] font-medium text-cream shadow-[0_16px_40px_-18px_rgba(58,43,35,0.65)]"
                  >
                    <span className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#cf7752] via-cinnabar to-crimson transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                    <span className="relative font-mono text-[0.9rem] tracking-[-0.01em]">
                      {site.emailLabel}
                    </span>
                    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream text-ink transition-transform duration-500 group-hover:rotate-12">
                      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                  </a>
                </Magnetic>
                <a
                  href={site.personal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 text-[0.95rem] text-muted underline decoration-ink/15 underline-offset-4 transition-colors hover:text-cinnabar hover:decoration-cinnabar/40"
                >
                  Life notes on obadimu.com
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>
          </Reveal>

          <AlsoStrip />
        </div>
      </div>
    </section>
  );
}
