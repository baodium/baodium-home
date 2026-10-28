"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { AmbientField } from "@/components/motion/AmbientField";
import { DriftChip } from "@/components/motion/IdleDrift";
import { useTilt } from "@/components/motion/useTilt";
import { projects } from "@/data/projects";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/** Compact homepage bridge to `/projects` — scroll presence + craft, not a gallery. */
export function Projects() {
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { rotateX, rotateY, handlers } = useTilt(4);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: reduce ? 400 : 100,
    damping: reduce ? 40 : 26,
    mass: 0.4,
  });
  const cardY = useTransform(smooth, [0.15, 0.55], reduce ? [0, 0] : [42, 0]);
  const cardScale = useTransform(smooth, [0.15, 0.55], reduce ? [1, 1] : [0.97, 1]);
  const chipLift = useTransform(smooth, [0.25, 0.65], reduce ? [0, 0] : [16, 0]);
  const rail = useTransform(smooth, [0.2, 0.55], reduce ? [1, 1] : [0.08, 1]);

  return (
    <section
      ref={sectionRef}
      id="projects"
      aria-labelledby="projects-heading"
      className="relative overflow-hidden bg-[#eef3f4] py-12 text-ink md:py-16"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <AmbientField tone="tide" density={14} className="opacity-45" />
        {!reduce ? (
          <>
            <DriftChip
              delay={0.4}
              amp={14}
              className="absolute left-[8%] top-[22%] font-mono text-[0.62rem] uppercase tracking-[0.2em] text-tide/55"
            >
              live
            </DriftChip>
            <DriftChip
              delay={1.6}
              amp={11}
              className="absolute bottom-[18%] right-[14%] font-mono text-[0.62rem] uppercase tracking-[0.2em] text-cinnabar/45"
            >
              baodium
            </DriftChip>
          </>
        ) : null}
      </div>

      <div className="shell relative z-[2]">
        <motion.div
          style={{ y: cardY, scale: cardScale, rotateX, rotateY, transformPerspective: 1400 }}
          {...handlers}
          className="[perspective:1400px]"
        >
          <Link
            href="/projects"
            className="group relative flex flex-col gap-6 overflow-hidden rounded-[1.5rem] border border-tide/20 bg-white px-5 py-7 shadow-[0_36px_80px_-44px_rgba(30,60,70,0.35)] transition-[border-color,box-shadow] duration-500 hover:border-tide/40 hover:shadow-[0_48px_96px_-40px_rgba(30,60,70,0.45)] sm:flex-row sm:items-stretch sm:justify-between sm:gap-10 sm:px-8 sm:py-8 md:rounded-[2rem]"
          >
            <motion.span
              aria-hidden="true"
              style={{ scaleX: rail }}
              className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left bg-tide/50"
            />

            <div className="relative z-[1] min-w-0 flex-1">
              <p className="kicker text-tide">Recent side projects</p>
              <h2
                id="projects-heading"
                className="mt-3 max-w-[18ch] font-serif text-[clamp(1.65rem,3vw,2.35rem)] italic leading-[1.08] tracking-[-0.03em] text-ink"
              >
                Interview Coach and UpTo.
              </h2>
              <p className="mt-3 max-w-md text-[0.98rem] leading-relaxed text-muted">
                One follows your answers in an interview. The other is a status
                page you update once and share everywhere.
              </p>

              <motion.ul style={{ y: chipLift }} className="mt-6 grid gap-3 sm:grid-cols-2">
                {projects.map((project, index) => (
                  <li key={project.slug}>
                    <motion.span
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: reduce ? 0 : 0.5,
                        delay: reduce ? 0 : 0.08 + index * 0.08,
                        ease,
                      }}
                      className={`relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition-[border-color,transform,box-shadow] duration-500 group-hover:-translate-y-0.5 ${
                        project.tone === "cinnabar"
                          ? "border-cinnabar/25 bg-[#faf4f0] group-hover:border-cinnabar/40 group-hover:shadow-[0_16px_28px_-18px_rgba(173,79,54,0.35)]"
                          : "border-tide/25 bg-[#f0f6f6] group-hover:border-tide/45 group-hover:shadow-[0_16px_28px_-18px_rgba(61,122,126,0.35)]"
                      }`}
                    >
                      <span className="relative z-[1] flex items-baseline justify-between gap-2">
                        <span className="font-serif text-[1.08rem] italic tracking-[-0.02em] text-ink">
                          {project.name}
                        </span>
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                          0{index + 1}
                        </span>
                      </span>
                      <span className="relative z-[1] mt-3 flex items-center gap-2 text-[0.82rem] leading-snug text-muted">
                        <motion.span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            project.tone === "cinnabar" ? "bg-cinnabar" : "bg-tide"
                          }`}
                          animate={
                            reduce
                              ? undefined
                              : { scale: [1, 1.45, 1], opacity: [0.7, 1, 0.7] }
                          }
                          transition={
                            reduce
                              ? undefined
                              : { duration: 2.2, repeat: Infinity, delay: index * 0.4 }
                          }
                        />
                        {project.tags.join(" · ")}
                      </span>
                    </motion.span>
                  </li>
                ))}
              </motion.ul>
            </div>

            <span className="relative z-[1] inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-tide/25 bg-[#f3f8f8] px-5 text-[0.95rem] font-medium text-tide transition-[background-color,border-color,color,transform,box-shadow] duration-500 group-hover:border-tide/45 group-hover:bg-white group-hover:text-ink group-hover:shadow-[0_12px_28px_-14px_rgba(61,122,126,0.4)] sm:self-end">
              View projects
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
