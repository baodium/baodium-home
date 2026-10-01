"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { CircuitField } from "@/components/hero/CircuitField";
import { KineticRoles } from "@/components/hero/KineticRoles";
import { Magnetic } from "@/components/Magnetic";
import { useHeroMotionOk } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;
const line =
  "I build software, systems, and products around reliability, infrastructure, AI, and how people work.";


export function HeroScene({ hasVideo }: { hasVideo: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const motionOk = useHeroMotionOk();
  const [paused, setPaused] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => setPaused(value > 0.98));

  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 140]);
  const photoScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.08]);
  const copyY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const shade = useTransform(scrollYProgress, [0, 1], [0, 0.75]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 50, damping: 18 });
  const spy = useSpring(py, { stiffness: 50, damping: 18 });
  const photoX = useTransform(spx, (v) => v * -16);
  const photoPY = useTransform(spy, (v) => v * -10);
  const glowX = useTransform(spx, (v) => v * 50);
  const glowY = useTransform(spy, (v) => v * 36);
  const lineX = useTransform(spx, (v) => v * 22);
  const lineY = useTransform(spy, (v) => v * 14);

  return (
    <section
      ref={ref}
      data-paused={paused}
      aria-label="Introduction"
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        px.set(event.clientX / window.innerWidth - 0.5);
        py.set(event.clientY / window.innerHeight - 0.5);
      }}
      className="grain relative isolate overflow-hidden bg-night lg:h-svh lg:min-h-[700px] [@media(min-width:1024px)_and_(min-height:700px)]:sticky [@media(min-width:1024px)_and_(min-height:700px)]:top-0"
    >
      {/* Ambient light behind and around the portrait */}
      <motion.div aria-hidden="true" style={{ x: glowX, y: glowY }} className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.2, ease }}
          className="absolute inset-0"
        >
          <div className="aurora absolute left-[38%] top-[18%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.42),rgba(216,38,43,0.14)_55%,transparent)] blur-2xl max-lg:left-[10%] max-lg:top-[-10%]" />
          <div className="aurora-slow absolute right-[-12%] top-[-8%] h-[48vmax] w-[48vmax] rounded-full bg-[radial-gradient(closest-side,rgba(255,164,92,0.26),transparent)] blur-2xl" />
          <div className="absolute bottom-[-30%] left-[-10%] h-[60vmax] w-[80vmax] rounded-full bg-[radial-gradient(closest-side,rgba(216,38,43,0.22),transparent)] blur-3xl" />
        </motion.div>
      </motion.div>

      {/* Portrait, melted into the page with masks */}
      <motion.div
        style={{ y: photoY, scale: photoScale }}
        className="relative h-[60svh] max-h-[600px] min-h-[400px] w-full max-lg:mt-16 lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
      >
        <motion.div style={{ x: photoX, y: photoPY }} className="absolute -inset-6">
          <motion.div
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.2, ease }}
            className="absolute inset-0 lg:inset-auto lg:bottom-0 lg:right-0 lg:aspect-[2752/1536] lg:h-[80%] lg:min-w-[70%] xl:h-[90%]"
          >
            <div className="hero-photo-mask absolute inset-0">
              <Portrait hasVideo={hasVideo && motionOk} />
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.8, ease }}
                className="absolute inset-0 bg-night"
              />
            </div>
          </motion.div>
        </motion.div>
        {/* Rim light that blends into the portrait without touching the face */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-[4%] h-[55%] w-[46%] rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.32),transparent)] mix-blend-screen blur-2xl max-lg:hidden"
        />
      </motion.div>

      <motion.div aria-hidden="true" style={{ x: lineX, y: lineY }} className="circuit-mask pointer-events-none absolute inset-0 max-lg:h-[64svh] max-lg:max-h-[620px] max-lg:opacity-60">
        <CircuitField />
      </motion.div>

      <motion.div
        aria-hidden="true"
        style={{ opacity: shade }}
        className="pointer-events-none absolute inset-0 z-[2] bg-night"
      />

      {/* Copy */}
      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="relative z-[3] -mt-24 px-5 pb-16 sm:px-8 md:-mt-40 lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center lg:px-0 lg:pb-0"
      >
        <div className="lg:ml-[max(2.5rem,calc((100vw-84rem)/2))] lg:max-w-[40rem]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="kicker items-center gap-2.5 rounded-full max-md:hidden md:inline-flex border border-white/10 bg-white/[0.04] px-3 py-1.5 text-cream/70 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cinnabar" />
            Baodium · Products and writing
          </motion.p>
          <h1 className="md:mt-6">
            <motion.span
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.42, ease }}
              className="block font-serif text-[clamp(1.6rem,2.4vw,2.25rem)] italic leading-none text-cream/90"
            >
              Adewale Obadimu
            </motion.span>
            <KineticRoles />
          </h1>

          <p className="mt-6 max-w-[27rem] text-[1.05rem] leading-[1.65] text-cream/70 md:text-lg">
            {line.split(" ").map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                className="inline-block"
                initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 1.35 + index * 0.025, ease }}
              >
                {word}&nbsp;
              </motion.span>
            ))}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.7, ease }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <a
                href="#work"
                className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#ff7a45] via-cinnabar to-crimson px-6 text-[0.95rem] font-medium text-white shadow-[0_10px_40px_-8px_rgba(236,61,32,0.65)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">See the work</span>
                <ArrowRight aria-hidden="true" className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
              </a>
            </Magnetic>
            <Magnetic strength={0.2}>
              <a
                href="#book"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 text-[0.95rem] text-cream backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
              >
                Read the book
              </a>
            </Magnetic>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        style={{ opacity: copyOpacity }}
        className="absolute inset-x-0 bottom-0 z-[3] hidden lg:block"
      >
        <div className="shell flex items-end justify-between pb-8">
          <a href="#work" className="group flex items-center gap-3 text-cream/55 transition-colors hover:text-cream">
            <span className="relative h-10 w-px overflow-hidden bg-white/10">
              <span className="scroll-cue absolute inset-0 bg-gradient-to-b from-amber to-cinnabar" />
            </span>
            <span className="kicker">Scroll</span>
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
          </a>
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
