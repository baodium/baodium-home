"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { AlsoStrip } from "@/components/AlsoStrip";
import { Reveal } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { site } from "@/data/site";

/**
 * Founder bridge — editorial letter, not a chip board:
 * name → one sharp line → Scholar as research thread → contact as ink → quiet Also.
 */
export function About() {
  const reduce = usePrefersReducedMotion();
  const bridgeRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: bridgeRef,
    offset: ["start 0.92", "start 0.45"],
  });
  const ruleScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.08, 1]);
  const ruleOpacity = useTransform(scrollYProgress, [0, 0.4, 1], reduce ? [1, 1, 1] : [0.15, 0.8, 1]);

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
            <h2
              id="about-heading"
              className="mt-5 max-w-[18ch] font-serif text-[clamp(2.35rem,5vw,4.5rem)] italic leading-[1.02] tracking-[-0.03em] text-ink"
            >
              {site.credit}
            </h2>
          </Reveal>

          <Reveal y={10} delay={0.06}>
            <p className="mt-7 max-w-[34rem] text-[clamp(1.12rem,1.65vw,1.32rem)] leading-relaxed text-ink/88">
              Baodium is his home for shipping products and writing production
              failures into design practice — not a studio pitch deck.
            </p>
          </Reveal>

          <Reveal y={12} delay={0.1} className="mt-9 max-w-[38rem] md:mt-11">
            <p className="text-[1.05rem] leading-relaxed text-muted">
              The research thread — misinformation, platforms, systems under
              pressure — lives on{" "}
              <a
                href={site.scholar}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-baseline gap-1.5 font-medium text-ink underline decoration-cinnabar/40 underline-offset-[0.22em] transition-colors hover:text-cinnabar hover:decoration-cinnabar"
              >
                Google Scholar
                <span className="font-mono text-[0.68rem] font-normal uppercase tracking-[0.12em] text-cinnabar">
                  {site.scholarCitations} citations
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 translate-y-0.5 text-cinnabar/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
          </Reveal>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: ruleScale, opacity: ruleOpacity }}
            className="mt-10 h-px origin-left bg-gradient-to-r from-cinnabar/55 via-cinnabar/20 to-transparent md:mt-12"
          />

          <Reveal y={12} delay={0.05} className="mt-9 md:mt-11">
            <p className="kicker text-muted">Write Baodium</p>
            <a
              href={site.email}
              className="group mt-4 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <span className="font-mono text-[clamp(1.35rem,2.8vw,2.15rem)] tracking-[-0.03em] text-ink transition-colors group-hover:text-cinnabar">
                {site.emailLabel}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-5 w-5 text-cinnabar transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
            <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted">
              Products, the book, Play, or a note — that address reaches him.
              Personal writing lives on{" "}
              <a
                href={site.personal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cinnabar underline decoration-cinnabar/35 underline-offset-4 transition-colors hover:text-ink"
              >
                obadimu.com
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
          </Reveal>

          <AlsoStrip />
        </div>
      </div>
    </section>
  );
}
