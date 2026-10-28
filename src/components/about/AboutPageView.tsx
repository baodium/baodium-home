"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, Mail } from "lucide-react";
import { AboutListen } from "@/components/about/AboutListen";
import { AmbientField } from "@/components/motion/AmbientField";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { site } from "@/data/site";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Dedicated About. Adewale behind Baodium.
 * Alive copper/cream craft: portrait field, letter, intentional Scholar, contact CTA, listen.
 * No giant raw email; no homepage duplicate.
 */
export function AboutPageView() {
  const reduce = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mistY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 110]);
  const mistOpacity = useTransform(scrollYProgress, [0, 0.9], reduce ? [1, 1] : [1, 0.35]);
  const portraitY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 56]);
  const titleY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 28]);

  const { scrollYProgress: letterProgress } = useScroll({
    target: letterRef,
    offset: ["start 0.92", "start 0.38"],
  });
  const ruleScale = useTransform(letterProgress, [0, 1], reduce ? [1, 1] : [0.04, 1]);
  const ruleOpacity = useTransform(
    letterProgress,
    [0, 0.3, 1],
    reduce ? [1, 1, 1] : [0.1, 0.8, 1],
  );
  const letterY = useTransform(letterProgress, [0, 1], reduce ? [0, 0] : [36, 0]);
  const letterOpacity = useTransform(
    letterProgress,
    [0, 0.45],
    reduce ? [1, 1] : [0.4, 1],
  );
  const listenY = useTransform(letterProgress, [0.35, 1], reduce ? [0, 0] : [28, 0]);

  return (
    <div className="relative overflow-hidden bg-cream text-ink">
      <section
        ref={heroRef}
        aria-labelledby="about-page-heading"
        className="relative isolate min-h-[88svh] overflow-hidden bg-night pb-16 pt-28 text-cream md:min-h-[92svh] md:pb-24 md:pt-32"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <motion.div
            style={{ y: mistY, opacity: mistOpacity }}
            className="absolute inset-0 bg-[#2a1712]"
          />
          <div className="absolute inset-0 bg-night/50" />
          <div className="grain absolute inset-0 opacity-45 mix-blend-soft-light" />
        </div>

        {/* Full-bleed portrait plane on large screens */}
        <motion.div
          style={{ y: portraitY }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block"
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0 : 1.4, ease }}
            className="absolute inset-0"
          >
            <Image
              src="/images/adewale-hero-poster.jpg"
              alt=""
              fill
              sizes="48vw"
              className="object-cover object-[78%_18%]"
              priority
            />
            <div className="absolute inset-y-0 left-0 w-[55%] bg-night/90" />
            <div className="absolute inset-x-0 bottom-0 h-[35%] bg-night/70" />
            <div className="absolute inset-x-0 top-0 h-[20%] bg-night/40" />
            <div className="absolute inset-0 bg-night/20 mix-blend-multiply" />
          </motion.div>
        </motion.div>

        <div className="shell relative z-[2] grid items-end gap-10 lg:min-h-[calc(92svh-8rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <motion.div style={{ y: titleY }} className="pb-4 lg:pb-10">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.05, ease }}
              className="kicker text-amber"
            >
              About
            </motion.p>

            <motion.h1
              id="about-page-heading"
              initial={reduce ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 1.05, delay: reduce ? 0 : 0.12, ease }}
              className="mt-5 max-w-[13ch] font-serif text-[clamp(3rem,8vw,5.75rem)] italic leading-[0.96] tracking-[-0.04em] text-cream"
            >
              {site.credit}
            </motion.h1>

            <motion.ul
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.32, ease }}
              className="mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-cream/55"
            >
              <li className="text-amber/90">Engineer</li>
              <li aria-hidden="true" className="text-cream/25">
                /
              </li>
              <li>Philanthropist</li>
              <li aria-hidden="true" className="text-cream/25">
                /
              </li>
              <li>Author</li>
            </motion.ul>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.75, delay: reduce ? 0 : 0.4, ease }}
              className="mt-7 max-w-lg text-[clamp(1.08rem,1.65vw,1.28rem)] leading-relaxed text-cream/72"
            >
              Baodium is his home for products and technical publishing: failures from
              production, written so the next design holds.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.52, ease }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <a
                href={site.email}
                className="group relative inline-flex min-h-12 items-center gap-2.5 overflow-hidden rounded-full bg-cream px-6 text-[0.95rem] font-medium text-ink shadow-[0_14px_40px_-16px_rgba(173,79,54,0.55)] transition-colors hover:bg-white"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-cinnabar/10 transition-transform duration-700 group-hover:translate-x-full"
                />
                <Mail aria-hidden="true" className="relative h-4 w-4 text-cinnabar" strokeWidth={2} />
                <span className="relative">Write Baodium</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="relative h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
                <span className="sr-only"> (opens email to {site.emailLabel})</span>
              </a>
              <a
                href={site.personal}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-12 items-center gap-2 px-2 text-[0.95rem] text-cream/70 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/55"
              >
                obadimu.com
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </motion.div>
          </motion.div>

          {/* Mobile / tablet portrait. edge composition, not a card collage */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.2, ease }}
            className="relative -mx-5 aspect-[5/4] overflow-hidden sm:-mx-8 lg:hidden"
          >
            <Image
              src="/images/adewale-hero-poster.jpg"
              alt="Adewale Obadimu"
              fill
              sizes="100vw"
              className="object-cover object-[72%_12%]"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-night/75" />
          </motion.div>
        </div>
      </section>

      <section
        aria-labelledby="about-letter-heading"
        className="relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <AmbientField tone="moss" density={14} className="opacity-40" />
          {!reduce ? (
            <span className="absolute inset-x-[18%] top-[22%] h-px overflow-hidden opacity-50">
              <span className="signal-scan block h-full w-1/3 bg-moss-soft/70" />
            </span>
          ) : null}
        </div>

        <div ref={letterRef} className="shell relative z-[2]">
          <motion.div style={{ y: letterY, opacity: letterOpacity }}>
            <Reveal y={14}>
              <p className="kicker text-moss">Founder</p>
              <SplitHeading
                id="about-letter-heading"
                text="Tools you can try. Failures you can study."
                accent={["Failures", "study"]}
                className="mt-5 max-w-[15ch] text-[clamp(2.25rem,5vw,3.85rem)] font-semibold leading-[1.02] tracking-[-0.042em] text-ink"
                accentClassName="font-serif font-normal italic text-cinnabar"
                delay={0.04}
              />
            </Reveal>

            <Reveal y={12} delay={0.08} className="mt-8 max-w-[40rem]">
              <p className="text-[clamp(1.12rem,1.6vw,1.32rem)] leading-relaxed text-ink/88">
                Not a pitch deck. Adewale builds Interview Coach and UpTo, and turns
                production failures into design practice: labs and drills where
                reliability is something you operate, not only read.
              </p>
            </Reveal>

            <Reveal y={12} delay={0.12} className="mt-10 max-w-[42rem] md:mt-12">
              <p className="text-[1.05rem] leading-relaxed text-muted">
                The research thread (misinformation, platforms, systems under pressure)
                lives on{" "}
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
                . Essays, scholarship, and the fuller person live on{" "}
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

            <motion.div
              aria-hidden="true"
              style={{ scaleX: ruleScale, opacity: ruleOpacity }}
              className="mt-12 h-px origin-left bg-cinnabar/45 md:mt-14"
            />

            <Reveal y={14} delay={0.05} className="mt-10 md:mt-12">
              <p className="kicker text-muted">Get in touch</p>
              <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-ink/85">
                Products, Play, corrections, or a note: reach him directly.
              </p>
              <a
                href={site.email}
                className="group mt-6 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-ink px-6 text-[0.95rem] font-medium text-cream transition-colors hover:bg-cinnabar"
              >
                <Mail aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                Write Baodium
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
                <span className="sr-only"> (opens email to {site.emailLabel})</span>
              </a>
            </Reveal>
          </motion.div>

          <motion.div style={{ y: listenY }}>
            <AboutListen />
          </motion.div>

          <Reveal y={10} className="mt-14 border-t border-ink/10 pt-10 md:mt-16">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[0.95rem]">
              <Link
                href="/projects"
                className="group inline-flex min-h-10 items-center gap-2 text-ink transition-colors hover:text-cinnabar"
              >
                Side projects
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/#play"
                className="group inline-flex min-h-10 items-center gap-2 text-ink transition-colors hover:text-cinnabar"
              >
                Play
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/system-design/experience"
                className="group inline-flex min-h-10 items-center gap-2 text-ink transition-colors hover:text-cinnabar"
              >
                Chapter 1 lab
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
