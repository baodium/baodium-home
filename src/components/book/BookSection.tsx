"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Book3D } from "@/components/book/Book3D";
import { LatencyChart } from "@/components/book/LatencyChart";
import { Magnetic } from "@/components/Magnetic";
import { Reveal } from "@/components/motion/Reveal";
import { book } from "@/data/writing";

const ease = [0.22, 1, 0.36, 1] as const;
const titleLines = [
  { word: "Practical", flame: false },
  { word: "System", flame: true },
  { word: "Design", flame: false },
];

export function BookSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scrollTurn = useTransform(scrollYProgress, [0.1, 0.6], reduce ? [22, 22] : [30, 15]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 120, damping: 16, mass: 0.5 });
  const spy = useSpring(py, { stiffness: 120, damping: 16, mass: 0.5 });
  const rotateY = useTransform(() => scrollTurn.get() + spx.get() * 34);
  const rotateX = useTransform(() => 4 + spy.get() * -22);
  const sheen = useTransform(spx, [-0.5, 0.5], [110, -10]);
  const glowX = useTransform(spx, (v) => v * 60);
  const glowY = useTransform(spy, (v) => v * 40);

  return (
    <section
      ref={ref}
      id="book"
      aria-labelledby="book-heading"
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width - 0.5);
        py.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="grain relative z-10 -mt-10 overflow-hidden rounded-t-[2rem] bg-night pb-20 pt-24 md:-mt-14 md:rounded-t-[3.5rem] md:pb-28 md:pt-36"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,239,229,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(245,239,229,0.045)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_70%_35%,#000,transparent)]" />
      </div>

      <div className="shell relative z-[2]">
        <div className="grid items-center gap-16 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-7 lg:col-span-6">
            <Reveal y={12}>
              <p className="kicker flex items-center gap-3 text-cream/55">
                <span className="text-cinnabar">(02)</span>
                <span className="h-px w-10 bg-white/20" />
                The book
              </p>
            </Reveal>
            <h2 id="book-heading" className="mt-7">
              <span className="sr-only">{book.title}</span>
              <motion.span
                aria-hidden="true"
                className="block text-[clamp(3.1rem,7.2vw,7.25rem)] font-bold uppercase leading-[0.86] tracking-[-0.045em]"
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                transition={{ staggerChildren: 0.12 }}
              >
                {titleLines.map((line) => (
                  <span key={line.word} className="block overflow-hidden pb-[0.04em]">
                    <motion.span
                      className={`block ${line.flame ? "text-flame-animated" : ""}`}
                      variants={{
                        hidden: { y: "105%", skewY: 6 },
                        shown: { y: "0%", skewY: 0, transition: { duration: 1, ease } },
                      }}
                    >
                      {line.word}
                    </motion.span>
                  </span>
                ))}
              </motion.span>
            </h2>
            <Reveal delay={0.3}>
              <p className="mt-8 max-w-lg font-serif text-[clamp(1.6rem,2.6vw,2.25rem)] italic leading-[1.12] text-cream/85">
                {book.subtitle}
              </p>
              <p className="mt-5 flex items-center gap-3 text-sm text-cream/60">
                <span className="h-px w-8 bg-cinnabar" />
                by {book.author}
              </p>
            </Reveal>
            <Reveal delay={0.45}>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Magnetic>
                  <a
                    href={book.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex min-h-14 items-center gap-3 overflow-hidden rounded-full bg-cream py-2 pl-7 pr-2 text-base font-medium text-ink shadow-[0_18px_50px_-12px_rgba(236,61,32,0.55)]"
                  >
                    <span className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#ff7a45] via-cinnabar to-crimson transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                    <span className="relative transition-colors duration-500 group-hover:text-white">Get it on Amazon</span>
                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream transition-transform duration-500 group-hover:rotate-45">
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Magnetic>
              </div>
            </Reveal>
          </div>

          <div className="relative md:col-span-5 lg:col-span-6" aria-hidden="true">
            <motion.div style={{ x: glowX, y: glowY }} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="breathe absolute h-[130%] w-[130%] rounded-full bg-[radial-gradient(closest-side,rgba(232,38,44,0.7),rgba(236,61,32,0.28)_45%,transparent_72%)] blur-2xl" />
              <div className="absolute aspect-square w-[62%] rounded-full bg-gradient-to-br from-[#ff7a45] via-crimson to-[#7a0d16] opacity-80 blur-[70px]" />
            </motion.div>
            <div className="relative py-6 lg:py-10">
              <Book3D rotateX={rotateX} rotateY={rotateY} sheen={sheen} />
            </div>
          </div>
        </div>

        <Reveal className="mt-20 md:mt-28">
          <figure className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 backdrop-blur-sm md:rounded-[2.25rem] md:p-10">
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <figcaption className="max-w-xl">
                <p className="kicker text-cream/45">Fig. 1 — From the cover</p>
                <p className="mt-3 font-serif text-[clamp(1.6rem,3vw,2.5rem)] leading-[1.1] text-cream">
                  The median says everything is fine. <span className="italic text-flame">The tail tells the truth.</span>
                </p>
              </figcaption>
              <div className="flex items-center gap-5 font-mono text-xs text-cream/60">
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-6 rounded bg-cream" /> p50
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-6 rounded bg-cinnabar" /> p99
                </span>
              </div>
            </div>
            <div className="relative mt-8 md:mt-10">
              <LatencyChart />
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
