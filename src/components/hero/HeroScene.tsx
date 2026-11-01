"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { KineticRoles } from "@/components/hero/KineticRoles";
import { SignatureTrace } from "@/components/hero/SignatureTrace";
import { Magnetic } from "@/components/Magnetic";
import { book } from "@/data/writing";
import { useHeroMotionOk, usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/** The trace finishes drawing into "Engineer" at LOCK_MS; that is when the word locks in. */
const TRACE_DELAY = 1.15;
const LOCK_MS = 1950;

export function HeroScene({ hasVideo }: { hasVideo: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reduce = usePrefersReducedMotion();
  const motionOk = useHeroMotionOk();
  const [active, setActive] = useState(-1);
  const [locked, setLocked] = useState(false);
  const [steering, setSteering] = useState(false);

  useEffect(() => {
    const lock = window.setTimeout(
      () => {
        setActive(0);
        setLocked(true);
      },
      reduce ? 0 : LOCK_MS,
    );
    return () => window.clearTimeout(lock);
  }, [reduce]);

  const select = (index: number) => setActive(index);

  /** The signal routes to whichever role sits nearest the pointer; on leave it rests there. */
  const steer = (clientY: number) => {
    const distances = wordRefs.current.map((node) => {
      if (!node) return Infinity;
      const rect = node.getBoundingClientRect();
      return Math.abs(rect.top + rect.height / 2 - clientY);
    });
    const nearest = distances.indexOf(Math.min(...distances));
    // A little hysteresis so the line doesn't flicker when the pointer sits between two words.
    setActive((value) => (value < 0 || distances[nearest] + 10 < distances[value] ? nearest : value));
  };


  // Depth: portrait (back) and type (front) drift against each other with the pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 45, damping: 18 });
  const spy = useSpring(py, { stiffness: 45, damping: 18 });
  const photoX = useTransform(spx, (v) => v * -14);
  const photoPY = useTransform(spy, (v) => v * -8);
  const typeX = useTransform(spx, (v) => v * 8);
  const typeY = useTransform(spy, (v) => v * 5);

  return (
    <section
      ref={ref}
      aria-label="Introduction"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        if (locked && window.innerWidth >= 1024) {
          if (!steering) setSteering(true);
          steer(event.clientY);
        }
        if (reduce) return;
        px.set(event.clientX / window.innerWidth - 0.5);
        py.set(event.clientY / window.innerHeight - 0.5);
      }}
      onPointerLeave={() => setSteering(false)}
      className="grain relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-night"
    >
      {/* Far plane: a flat warm field. No decorative gradient. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[#2a1712]">
        <div className="absolute inset-0 bg-night/55" />
      </div>
      {/* Mid plane: the portrait, melted into the field */}
      <motion.div className="relative min-h-0 w-full flex-1 max-lg:mt-16 lg:absolute lg:inset-0 lg:h-full">
        <motion.div style={{ x: photoX, y: photoPY }} className="absolute -inset-6">
          <motion.div
            ref={photoRef}
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.2, ease }}
            className="absolute inset-0 lg:inset-auto lg:bottom-0 lg:right-0 lg:aspect-[2752/1536] lg:h-[88%] lg:min-w-[74%] xl:h-[96%]"
          >
            <div className="hero-photo-mask absolute inset-0 overflow-hidden">
              <Portrait hasVideo={hasVideo && motionOk} />
              {/* Lifts only the photo's black backdrop to the warm field; anything brighter, like skin, passes through. */}
              <div aria-hidden="true" className="absolute inset-0 bg-night mix-blend-lighten" />
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.6, ease }}
                className="absolute inset-0 bg-night"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Near plane: the signature trace, drawn into the roles. */}
      <div className="pointer-events-none absolute inset-0 z-[4] hidden lg:block">
        <SignatureTrace sectionRef={ref} photoRef={photoRef} wordRefs={wordRefs} active={active} drawDelay={reduce ? 0 : TRACE_DELAY} instant={!!reduce} />
      </div>

      <div className="relative z-[3] shrink-0 px-5 pb-6 sm:px-8 lg:absolute lg:inset-0 lg:flex lg:items-center lg:px-0 lg:pb-0">
        <div className="flex w-full flex-col gap-8 lg:ml-[max(2.5rem,calc((100vw-84rem)/2))] lg:mr-[max(1.5rem,calc((100vw-84rem)/2))] lg:max-w-[84rem] lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <motion.div
            data-hero-line
            style={{
              x: typeX,
              y: typeY,
            }}
            className="lg:max-w-[38rem]"
          >
            <h1>
              <motion.span
                initial={reduce ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.2, ease }}
                className="block text-[clamp(2rem,min(6.4vw,8vh),5.5rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-cream"
              >
                <span className="text-flame">BAODIUM</span>
              </motion.span>
              <KineticRoles active={active} wordRefs={wordRefs} onSelect={select} />
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.75, delay: reduce ? 0 : 1.15, ease }}
              className="mt-4 max-w-[28rem] text-[clamp(0.95rem,min(1.45vw,2.4vh),1.18rem)] leading-relaxed text-cream/68 lg:mt-6"
            >
              Products, a free system-design book, and labs that let you operate
              the failures the chapters explain.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 1.35, ease }}
              className="mt-5 flex flex-wrap items-center gap-3 lg:mt-8"
            >
              <Magnetic>
                <Link
                  href={book.readPath}
                  className="btn btn-cream group relative min-h-12 overflow-hidden px-6 text-[0.95rem]"
                >
                  <span className="relative">Read the book for free</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={2}
                  />
                </Link>
              </Magnetic>
              <Link
                href="/system-design/experience/chapter-1"
                className="inline-flex min-h-12 items-center gap-1.5 px-2 text-[0.95rem] text-cream/75 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/55"
              >
                Chapter 1 lab
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const position = "object-[72%_0%] lg:object-[88%_38%]";

function Portrait({ hasVideo }: { hasVideo: boolean }) {
  if (hasVideo) {
    return (
      <video
        className={`absolute inset-0 h-full w-full object-cover ${position}`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/adewale-hero-poster.jpg"
        aria-label="Adewale Obadimu"
      >
        <source src="/media/adewale-hero.mp4" type="video/mp4" />
      </video>
    );
  }
  return (
    <Image
      src="/images/adewale-hero-poster.jpg"
      alt="Adewale Obadimu"
      fill
      preload
      sizes="(min-width: 1024px) 92vw, 100vw"
      className={`object-cover ${position}`}
    />
  );
}
