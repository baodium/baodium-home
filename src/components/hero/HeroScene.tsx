"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { CircuitField } from "@/components/hero/CircuitField";
import { KineticRoles, roles } from "@/components/hero/KineticRoles";
import { SignatureTrace } from "@/components/hero/SignatureTrace";
import { Magnetic } from "@/components/Magnetic";
import { projects } from "@/data/projects";
import { useHeroMotionOk, usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;
const line =
  "I build software, systems, and products around reliability, infrastructure, AI, and how people work.";

/** The trace finishes drawing into "Engineer" at LOCK_MS; that is when the word locks in. */
const TRACE_DELAY = 1.15;
const LOCK_MS = 1950;
const CYCLE_MS = 2800;
const liveCount = projects.filter((project) => project.status === "Live").length;

export function HeroScene({ hasVideo }: { hasVideo: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reduce = usePrefersReducedMotion();
  const motionOk = useHeroMotionOk();
  const [paused, setPaused] = useState(false);
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

  useEffect(() => {
    if (!locked || steering || reduce) return;
    const interval = window.setInterval(() => setActive((value) => (value + 1) % roles.length), CYCLE_MS);
    return () => window.clearInterval(interval);
  }, [locked, steering, reduce]);

  /** The signal routes to whichever role sits nearest the pointer; on leave it rests there. */
  const steer = (clientY: number) => {
    let nearest = 0;
    let best = Infinity;
    wordRefs.current.forEach((node, index) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - clientY);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive((value) => (value === nearest ? value : nearest));
  };

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => setPaused(value > 0.98));

  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 120]);
  const copyY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -110]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const shade = useTransform(scrollYProgress, [0, 1], [0, 0.8]);

  // Three depth planes: field (far), portrait (mid), type (near, moves against the pointer).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 45, damping: 18 });
  const spy = useSpring(py, { stiffness: 45, damping: 18 });
  const fieldX = useTransform(spx, (v) => v * 10);
  const fieldY = useTransform(spy, (v) => v * 6);
  const photoX = useTransform(spx, (v) => v * -14);
  const photoPY = useTransform(spy, (v) => v * -8);
  const typeX = useTransform(spx, (v) => v * 8);
  const typeY = useTransform(spy, (v) => v * 5);

  return (
    <section
      ref={ref}
      data-paused={paused}
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
      className="grain relative isolate overflow-hidden bg-night lg:h-svh lg:min-h-[700px] [@media(min-width:1024px)_and_(min-height:700px)]:sticky [@media(min-width:1024px)_and_(min-height:700px)]:top-0"
    >
      {/* Far plane: one warm light and the circuit field */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4, ease }}
          className="aurora absolute left-[34%] top-[8%] h-[72vmax] w-[72vmax] rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.34),rgba(216,38,43,0.1)_55%,transparent)] blur-2xl max-lg:left-[5%] max-lg:top-[-12%]"
        />
      </div>
      <motion.div
        aria-hidden="true"
        style={{ x: fieldX, y: fieldY }}
        className="circuit-mask pointer-events-none absolute inset-0 max-lg:h-[calc(60svh+4rem)] max-lg:max-h-[664px] max-lg:opacity-50"
      >
        <CircuitField />
      </motion.div>

      {/* Mid plane: the portrait, melted into the field */}
      <motion.div
        style={{ y: photoY }}
        className="relative h-[60svh] max-h-[600px] min-h-[400px] w-full max-lg:mt-16 lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
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

      <motion.div aria-hidden="true" style={{ opacity: shade }} className="pointer-events-none absolute inset-0 z-[2] bg-night" />

      {/* Near plane: type, the signature trace, and a quiet HUD */}
      <motion.div style={{ opacity: copyOpacity }} className="pointer-events-none absolute inset-0 z-[4] hidden lg:block">
        <SignatureTrace sectionRef={ref} photoRef={photoRef} wordRefs={wordRefs} active={active} drawDelay={reduce ? 0 : TRACE_DELAY} instant={!!reduce} />
      </motion.div>

      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="relative z-[3] -mt-24 px-5 pb-16 sm:px-8 md:-mt-36 lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center lg:px-0 lg:pb-0"
      >
        <motion.div style={{ x: typeX, y: typeY }} className="lg:ml-[max(2.5rem,calc((100vw-84rem)/2))] lg:max-w-[40rem]">
          <h1>
            <motion.span
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease }}
              className="block font-serif text-[clamp(1.6rem,2.4vw,2.25rem)] italic leading-none text-cream/90"
            >
              Adewale Obadimu
            </motion.span>
            <KineticRoles active={active} wordRefs={wordRefs} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.5, ease }}
            data-hero-line=""
            className="mt-6 max-w-[27rem] text-[1.05rem] lg:max-w-[22rem] xl:max-w-[27rem] leading-[1.65] text-cream/70 md:text-lg"
          >
            {line}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.75, ease }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <a
                href="#work"
                className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#ff7a45] via-cinnabar to-crimson px-6 text-[0.95rem] font-medium text-white shadow-[0_10px_40px_-10px_rgba(236,61,32,0.6)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">See the work</span>
                <ArrowRight aria-hidden="true" className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
              </a>
            </Magnetic>
            <a
              href="#book"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-[0.95rem] text-cream transition-colors hover:border-white/35 hover:bg-white/[0.05]"
            >
              Read the book
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3, duration: 1.2 }}
        style={{ opacity: copyOpacity }}
        className="pointer-events-none absolute inset-0 z-[3] hidden lg:block"
      >
        <div className="shell pointer-events-auto absolute inset-x-0 bottom-0 flex items-end justify-between pb-9">
          <a href="#work" className="group flex items-center gap-3 text-cream/50 transition-colors hover:text-cream">
            <span className="relative h-10 w-px overflow-hidden bg-white/10">
              <span className="scroll-cue absolute inset-0 bg-gradient-to-b from-amber to-cinnabar" />
            </span>
            <span className="kicker">Scroll</span>
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
          </a>
          <p className="kicker flex items-center gap-2.5 text-cream/50">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5fd38a] shadow-[0_0_10px_rgba(95,211,138,0.8)]" />
            Products live · {String(liveCount).padStart(2, "0")}
          </p>
        </div>
      </motion.div>
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
