"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
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

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scrollTurn = useTransform(
    scrollYProgress,
    [0.1, 0.6],
    reduce ? [22, 22] : [30, 15],
  );

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
      className="relative bg-cream px-3 md:px-5"
    >
      <div className="grain relative overflow-hidden rounded-[2rem] bg-ember pb-24 pt-24 md:rounded-[3rem] md:pb-32 md:pt-32">
        <div className="shell relative z-[2]">
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-10">
            <div className="md:col-span-7 lg:col-span-6">
              <Reveal y={12}>
                <p className="kicker text-amber">Book</p>
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
                    <span
                      key={line.word}
                      className="block overflow-hidden pb-[0.04em]"
                    >
                      <motion.span
                        className={`block ${line.flame ? "text-flame-animated" : ""}`}
                        variants={{
                          hidden: { y: "105%" },
                          shown: {
                            y: "0%",
                                                        transition: { duration: 1, ease },
                          },
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
                  by {book.author}
                </p>
              </Reveal>
              <Reveal delay={0.45}>
                <div className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Magnetic>
                    <a
                      href={book.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative inline-flex min-h-14 items-center gap-3 overflow-hidden rounded-full bg-cream py-2 pl-7 pr-2 text-base font-medium text-ink shadow-[0_18px_50px_-12px_rgba(173,79,54,0.55)]"
                    >
                      <span className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#cf7752] via-cinnabar to-crimson transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                      <span className="relative transition-colors duration-500 group-hover:text-white">
                        Get it on Amazon
                      </span>
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ember text-cream transition-transform duration-500 group-hover:rotate-45">
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-4 w-4"
                          strokeWidth={2}
                        />
                      </span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </Magnetic>
                  <Magnetic>
                    <Link
                      href={book.readPath}
                      className="group relative inline-flex min-h-14 items-center gap-3 rounded-full border border-cream/30 py-2 pl-7 pr-2 text-base font-medium text-cream transition-colors duration-500 hover:border-cream/60 hover:bg-white/[0.06]"
                    >
                      Read for free
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#cf7752] via-cinnabar to-crimson text-white transition-transform duration-500 group-hover:translate-x-0.5">
                        <BookOpen aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </Link>
                  </Magnetic>
                </div>
              </Reveal>
            </div>

            <Link
              href={book.readPath}
              aria-label={`Read ${book.title} for free`}
              className="group/cover relative block cursor-pointer rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-cinnabar/60 max-md:order-first max-md:mx-auto max-md:w-[78%] md:col-span-5 lg:col-span-6"
            >
              <motion.div
                aria-hidden="true"
                style={{ x: glowX, y: glowY }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="absolute h-[120%] w-[120%] rounded-full bg-[radial-gradient(closest-side,rgba(190,84,58,0.5),rgba(190,84,58,0.16)_48%,transparent_72%)] opacity-80 blur-2xl transition-opacity duration-700 group-hover/cover:opacity-100" />
              </motion.div>
              <div className="relative py-6 lg:py-10">
                <Book3D rotateX={rotateX} rotateY={rotateY} sheen={sheen} />
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-1/2 inline-flex h-11 w-11 -translate-x-1/2 translate-y-2 items-center justify-center rounded-full bg-cream text-ink opacity-0 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover/cover:translate-y-0 group-hover/cover:opacity-100 group-focus-visible/cover:translate-y-0 group-focus-visible/cover:opacity-100 max-md:hidden lg:bottom-4"
                >
                  <BookOpen className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
            </Link>
          </div>

          <Reveal className="mt-24 md:mt-36">
            <LatencyFigure />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
