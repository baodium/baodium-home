"use client";

import { useRef } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { ArrowUpRight } from "lucide-react";
import { Book3D } from "@/components/book/Book3D";
import { LatencyFigure } from "@/components/book/LatencyChart";
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
  const reduce = usePrefersReducedMotion();

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
      className="grain relative z-10 -mt-10 overflow-hidden rounded-t-[2rem] bg-ember pb-32 pt-28 md:-mt-14 md:rounded-t-[3.5rem] md:pb-44 md:pt-40"
    >
      <div className="shell relative z-[2]">
        <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-7 lg:col-span-6">
            <Reveal y={12}>
              <p className="kicker text-amber">The book</p>
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
                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ember text-cream transition-transform duration-500 group-hover:rotate-45">
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Magnetic>
              </div>
            </Reveal>
          </div>

          <div className="relative max-md:order-first max-md:mx-auto max-md:w-[78%] md:col-span-5 lg:col-span-6" aria-hidden="true">
            <motion.div style={{ x: glowX, y: glowY }} className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="breathe absolute h-[120%] w-[120%] rounded-full bg-[radial-gradient(closest-side,rgba(232,38,44,0.62),rgba(236,61,32,0.22)_48%,transparent_72%)] blur-2xl" />
            </motion.div>
            <div className="relative py-6 lg:py-10">
              <Book3D rotateX={rotateX} rotateY={rotateY} sheen={sheen} />
            </div>
          </div>
        </div>

        <Reveal className="mt-24 md:mt-36">
          <LatencyFigure />
        </Reveal>
      </div>
    </section>
  );
}
