"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { projects } from "@/data/projects";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/** Compact homepage bridge to `/projects` — one row, not a gallery. */
export function Projects() {
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: reduce ? 400 : 100,
    damping: reduce ? 40 : 26,
    mass: 0.4,
  });
  const rowY = useTransform(smooth, [0.15, 0.55], reduce ? [0, 0] : [28, 0]);
  const rail = useTransform(smooth, [0.2, 0.55], reduce ? [1, 1] : [0.08, 1]);

  return (
    <section
      ref={sectionRef}
      id="projects"
      aria-labelledby="projects-heading"
      className="relative overflow-hidden bg-[#eef3f4] py-12 text-ink md:py-16"
    >
      <div className="shell relative z-[2]">
        <motion.div style={{ y: rowY }}>
          <Link
            href="/projects"
            className="group relative flex flex-col gap-5 overflow-hidden rounded-[1.35rem] border border-tide/20 bg-white px-5 py-6 transition-[border-color,box-shadow] duration-500 hover:border-tide/40 hover:shadow-[0_36px_72px_-48px_rgba(30,60,70,0.4)] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-7 md:rounded-[1.75rem]"
          >
            <motion.span
              aria-hidden="true"
              style={{ scaleX: rail }}
              className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left bg-tide/50"
            />

            <div className="relative z-[1] min-w-0 flex-1">
              <p className="kicker text-tide">Projects</p>
              <h2
                id="projects-heading"
                className="mt-2 max-w-[22ch] font-serif text-[clamp(1.55rem,2.8vw,2.1rem)] italic leading-[1.08] tracking-[-0.03em] text-ink"
              >
                Interview Coach and UpTo.
              </h2>
              <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">
                Live products with full-page walkthroughs. One follows your
                interview answers. The other is a status page you update once.
              </p>
              <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-tide/80">
                {projects.map((p) => p.name).join(" · ")}
              </p>
            </div>

            <span className="relative z-[1] inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-tide/25 bg-[#f3f8f8] px-5 text-[0.92rem] font-medium text-tide transition-[background-color,border-color,color,transform] duration-500 group-hover:border-tide/45 group-hover:bg-white group-hover:text-ink sm:self-center">
              Open projects
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2}
              />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
