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
import { ArrowUpRight, BookOpen, FlaskConical } from "lucide-react";
import { Book3D } from "@/components/book/Book3D";
import { Magnetic } from "@/components/Magnetic";
import { useIdleDrift } from "@/components/motion/IdleDrift";
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
  const copyY = useTransform(scrollYProgress, [0.05, 0.55], reduce ? [0, 0] : [42, -28]);
  const copyOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.55, 0.85],
    reduce ? [1, 1, 1, 1] : [0.25, 1, 1, 0.7],
  );
  const coverLift = useTransform(scrollYProgress, [0.15, 0.65], reduce ? [0, 0] : [48, -20]);
  const coverScale = useTransform(scrollYProgress, [0.15, 0.55], reduce ? [1, 1] : [0.94, 1]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 120, damping: 16, mass: 0.5 });
  const spy = useSpring(py, { stiffness: 120, damping: 16, mass: 0.5 });
  const { x: driftX, y: driftY } = useIdleDrift(spx, spy, {
    ampX: reduce ? 0 : 0.14,
    ampY: reduce ? 0 : 0.09,
    periodMs: 6400,
  });
  const rotateY = useTransform(() => scrollTurn.get() + driftX.get() * 34);
  const rotateX = useTransform(() => 4 + driftY.get() * -22);
  const sheen = useTransform(driftX, [-0.5, 0.5], [110, -10]);

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
      <div className="grain relative overflow-hidden rounded-[2rem] bg-ember pb-10 pt-12 md:rounded-[3rem] md:pb-14 md:pt-20">
        {!reduce ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[18%] h-px overflow-hidden opacity-60"
          >
            <div className="signal-scan h-full w-1/3 bg-amber/70" />
          </div>
        ) : null}
        <div className="shell relative z-[2]">
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-10">
            <motion.div
              style={{ y: copyY, opacity: copyOpacity }}
              className="md:col-span-7 lg:col-span-6"
            >
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
                  viewport={{ once: true, margin: "0px 0px 18% 0px" }}
                  transition={{ staggerChildren: reduce ? 0 : 0.04 }}
                >
                  {titleLines.map((line) => (
                    <span
                      key={line.word}
                      className="block overflow-hidden pb-[0.04em]"
                    >
                      <motion.span
                        className={`block ${line.flame ? "text-flame" : ""}`}
                        variants={{
                          hidden: { y: reduce ? "0%" : "105%" },
                          shown: {
                            y: "0%",
                            transition: { duration: reduce ? 0 : 0.45, ease },
                          },
                        }}
                      >
                        {line.word}
                      </motion.span>
                    </span>
                  ))}
                </motion.span>
              </h2>
              <Reveal delay={0.05}>
                <p className="mt-8 max-w-lg font-serif text-[clamp(1.45rem,2.4vw,2rem)] italic leading-[1.15] text-cream/88">
                  Failures from production, written so the next design holds.
                </p>
                <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-cream/55">
                  Free to read here. Pair a chapter with its experience lab when
                  you want to operate the failure, not only study it.
                </p>
                <p className="mt-4 text-sm text-cream/45">by {book.author}</p>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Magnetic>
                    <Link
                      href={book.readPath}
                      className="group relative inline-flex min-h-14 items-center gap-3 overflow-hidden rounded-full bg-cream py-2 pl-7 pr-2 text-base font-medium text-ink shadow-[0_18px_50px_-12px_rgba(173,79,54,0.55)]"
                    >
                      <span className="absolute inset-0 origin-left scale-x-0 bg-cinnabar transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                      <span className="relative transition-colors duration-500 group-hover:text-white">
                        Read the book for free
                      </span>
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-ember text-cream transition-transform duration-500 group-hover:translate-x-0.5">
                        <BookOpen
                          aria-hidden="true"
                          className="h-4 w-4"
                          strokeWidth={2}
                        />
                      </span>
                    </Link>
                  </Magnetic>
                  <Magnetic>
                    <Link
                      href="/system-design/experience"
                      className="group relative inline-flex min-h-14 items-center gap-3 rounded-full border border-cream/30 py-2 pl-7 pr-2 text-base font-medium text-cream transition-colors duration-500 hover:border-cream/60 hover:bg-white/[0.06]"
                    >
                      Experience lab
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cinnabar text-white transition-transform duration-500 group-hover:rotate-6">
                        <FlaskConical aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </Link>
                  </Magnetic>
                  <a
                    href={book.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center gap-1.5 px-2 text-[0.95rem] text-cream/70 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/55"
                  >
                    Amazon
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
                <p className="mt-5">
                  <Link
                    href="/system-design"
                    className="text-sm text-cream/55 transition-colors hover:text-cream"
                  >
                    Full contents on the book page →
                  </Link>
                </p>
              </Reveal>
            </motion.div>

            <motion.div
              style={{ y: coverLift, scale: coverScale }}
              className="max-md:order-first max-md:mx-auto max-md:w-[70%] md:col-span-5 lg:col-span-6"
            >
            <Link
              href={book.readPath}
              aria-label={`Read ${book.title} for free`}
              className="group/cover relative block cursor-pointer rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-cinnabar/60"
            >
              <div className="relative py-1 lg:py-10">
                <Book3D rotateX={rotateX} rotateY={rotateY} sheen={sheen} />
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-1/2 inline-flex h-11 w-11 -translate-x-1/2 translate-y-2 items-center justify-center rounded-full bg-cream text-ink opacity-0 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover/cover:translate-y-0 group-hover/cover:opacity-100 group-focus-visible/cover:translate-y-0 group-focus-visible/cover:opacity-100 max-md:hidden lg:bottom-4"
                >
                  <BookOpen className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
            </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
