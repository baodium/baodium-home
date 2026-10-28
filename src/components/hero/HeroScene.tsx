"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowRight } from "lucide-react";
import { KineticRoles } from "@/components/hero/KineticRoles";
import { SignatureTrace } from "@/components/hero/SignatureTrace";
import { Magnetic } from "@/components/Magnetic";
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


  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 110]);
  const photoScale = useTransform(scrollYProgress, [0, 0.85], reduce ? [1, 1] : [1, 1.06]);
  const typeExitY = useTransform(scrollYProgress, [0, 0.58], reduce ? [0, 0] : [0, -64]);
  const typeExitOpacity = useTransform(scrollYProgress, [0, 0.38], reduce ? [1, 1] : [1, 0]);
  const typeExitFilter = useTransform(
    scrollYProgress,
    [0, 0.35],
    reduce ? ["blur(0px)", "blur(0px)"] : ["blur(0px)", "blur(10px)"],
  );
  const mistDrift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 90]);

  // Depth: portrait (back) and type (front) drift against each other with the pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 45, damping: 18 });
  const spy = useSpring(py, { stiffness: 45, damping: 18 });
  const photoX = useTransform(spx, (v) => v * -14);
  const photoPY = useTransform(spy, (v) => v * -8);
  const typeX = useTransform(spx, (v) => v * 8);
  const typePointerY = useTransform(spy, (v) => v * 5);
  const typeY = useTransform(() => typePointerY.get() + typeExitY.get());

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
      className="grain relative isolate overflow-hidden bg-night lg:h-svh lg:min-h-[700px]"
    >
      {/* Far plane: warm light that keeps drifting (hero look preserved) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          style={{ y: mistDrift }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4, ease }}
          className="aurora absolute left-[34%] top-[8%] h-[72vmax] w-[72vmax] rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.34),rgba(151,64,49,0.1)_55%,transparent)] blur-2xl max-lg:left-[5%] max-lg:top-[-12%]"
        />
        {!reduce ? (
          <motion.div
            style={{ y: mistDrift }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.7, 0.4, 0.65, 0.35] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="aurora-slow absolute bottom-[-18%] left-[-8%] h-[48vmax] w-[48vmax] rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.18),transparent)] blur-3xl max-lg:hidden"
          />
        ) : null}
      </div>
      {/* Mid plane: the portrait, melted into the field */}
      <motion.div
        style={{ y: photoY, scale: photoScale }}
        className="relative h-[46svh] max-h-[560px] min-h-[300px] w-full max-lg:mt-14 lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
      >
        <motion.div style={{ x: photoX, y: photoPY }} className="absolute -inset-6">
          <motion.div
            ref={photoRef}
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.2, ease }}
            className="absolute inset-0 lg:inset-auto lg:bottom-0 lg:right-0 lg:aspect-[2752/1536] lg:h-[80%] lg:min-w-[70%] xl:h-[90%]"
          >
            <div className="hero-photo-mask absolute inset-0 overflow-hidden">
              <Portrait hasVideo={hasVideo && motionOk} />
              {/* Lifts only the photo's black backdrop to the warm field; anything brighter, like skin, passes through. */}
              <div aria-hidden="true" className="absolute inset-0 bg-night mix-blend-lighten" />
              <div aria-hidden="true" className="portrait-sweep absolute inset-y-0 -left-1/2 w-1/2" />
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

      {/* Near plane: type and the signature trace — fade with type so path never desyncs mid-scroll */}
      <motion.div
        style={{ opacity: typeExitOpacity }}
        className="pointer-events-none absolute inset-0 z-[4] hidden lg:block"
      >
        <SignatureTrace sectionRef={ref} photoRef={photoRef} wordRefs={wordRefs} active={active} drawDelay={reduce ? 0 : TRACE_DELAY} instant={!!reduce} />
      </motion.div>

      <div
        className="relative z-[3] -mt-28 px-5 pb-12 sm:px-8 md:-mt-32 lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center lg:px-0 lg:pb-0"
      >
        <motion.div
          data-hero-line
          style={{
            x: typeX,
            y: typeY,
            opacity: typeExitOpacity,
            filter: typeExitFilter,
          }}
          className="lg:ml-[max(2.5rem,calc((100vw-84rem)/2))] lg:max-w-[40rem]"
        >
          <h1>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.2, ease }}
              className="block text-[clamp(2.65rem,6.4vw,5.5rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-cream"
            >
              <span className="text-flame-animated">BAODIUM</span>
            </motion.span>
            <KineticRoles active={active} wordRefs={wordRefs} onSelect={select} />
          </h1>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 1.35, ease }}
            className="mt-7 flex flex-wrap items-center gap-3 md:mt-8"
          >
            <Magnetic>
              <a
                href="#play"
                className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#cf7752] via-cinnabar to-crimson px-6 text-[0.95rem] font-medium text-white shadow-[0_10px_40px_-10px_rgba(173,79,54,0.6)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Interactive hub</span>
                <ArrowRight aria-hidden="true" className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
              </a>
            </Magnetic>
            <Link
              href="/projects"
              className="inline-flex min-h-12 items-center gap-1.5 px-2 text-[0.95rem] text-cream/75 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/55"
            >
              Side projects
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-12 items-center gap-1.5 px-2 text-[0.95rem] text-cream/75 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/55"
            >
              About
            </Link>
          </motion.div>
        </motion.div>
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
