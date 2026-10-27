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
  const glowY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [28, -36]);
  const cardY = useTransform(smooth, [0.15, 0.55], reduce ? [0, 0] : [42, 0]);
  const cardScale = useTransform(smooth, [0.15, 0.55], reduce ? [1, 1] : [0.97, 1]);
  const sheen = useTransform(smooth, [0.2, 0.8], reduce ? ["0%", "0%"] : ["-14%", "18%"]);
  const chipLift = useTransform(smooth, [0.25, 0.65], reduce ? [0, 0] : [16, 0]);

  return (
    <section
      ref={sectionRef}
      id="projects"
      aria-labelledby="projects-heading"
      className="relative overflow-hidden bg-[#eef3f4] py-12 text-ink md:py-16"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <AmbientField tone="tide" density={14} className="opacity-55" />
        <motion.div
          style={{ y: glowY }}
          className="absolute left-1/2 top-1/2 h-[34vmax] w-[64vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(94,168,168,0.28),transparent)] blur-2xl"
        />
        {!reduce ? (
          <>
            <motion.div
              animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.08, 1], x: [0, 18, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="absolute right-[6%] top-[14%] h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(61,122,126,0.22),transparent)] blur-2xl"
            />
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
            className="group relative flex flex-col gap-6 overflow-hidden rounded-[1.5rem] border border-tide/15 bg-gradient-to-br from-white/80 via-[#f3f8f8]/70 to-[#e7f0f0]/65 px-5 py-7 shadow-[0_36px_80px_-44px_rgba(30,60,70,0.45)] transition-[border-color,box-shadow] duration-500 hover:border-tide/35 hover:shadow-[0_48px_96px_-40px_rgba(30,60,70,0.55)] sm:flex-row sm:items-stretch sm:justify-between sm:gap-10 sm:px-8 sm:py-8 md:rounded-[2rem]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(94,168,168,0.2),transparent_55%)]"
            />
            <span
              aria-hidden="true"
              className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <motion.span
              aria-hidden="true"
              style={{ x: sheen }}
              className="pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-50 mix-blend-soft-light"
            />
            {!reduce ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
              >
                <span className="signal-scan block h-full w-1/3 bg-gradient-to-r from-transparent via-tide-soft/80 to-transparent" />
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.14),transparent)] blur-2xl transition-opacity duration-500 group-hover:opacity-100"
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
                      className={`relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-2xl border p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-[border-color,transform,box-shadow] duration-400 group-hover:-translate-y-0.5 ${
                        project.tone === "cinnabar"
                          ? "border-cinnabar/20 bg-gradient-to-br from-white/80 via-white/55 to-[#f3e0d4]/70 group-hover:border-cinnabar/35 group-hover:shadow-[0_16px_28px_-18px_rgba(173,79,54,0.45)]"
                          : "border-tide/25 bg-gradient-to-br from-white/75 via-[#e8f3f3]/70 to-[#d5e8e8]/55 group-hover:border-tide/45 group-hover:shadow-[0_16px_28px_-18px_rgba(61,122,126,0.45)]"
                      }`}
                    >
                      {!reduce ? (
                        <motion.span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          animate={{
                            opacity: [0.2, 0.55, 0.2],
                            y: [0, index % 2 === 0 ? -5 : 5, 0],
                          }}
                          transition={{
                            duration: 4.8 + index,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: index * 0.55,
                          }}
                        >
                          <span
                            className={`absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl ${
                              project.tone === "cinnabar"
                                ? "bg-[radial-gradient(closest-side,rgba(173,79,54,0.28),transparent)]"
                                : "bg-[radial-gradient(closest-side,rgba(94,168,168,0.32),transparent)]"
                            }`}
                          />
                        </motion.span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl ${
                            project.tone === "cinnabar"
                              ? "bg-[radial-gradient(closest-side,rgba(173,79,54,0.22),transparent)]"
                              : "bg-[radial-gradient(closest-side,rgba(94,168,168,0.28),transparent)]"
                          }`}
                        />
                      )}
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

            <span className="relative z-[1] inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-tide/25 bg-gradient-to-r from-tide/[0.1] to-amber/[0.08] px-5 text-[0.95rem] font-medium text-tide transition-[background-color,border-color,color,transform,box-shadow] duration-400 group-hover:border-tide/45 group-hover:text-ink group-hover:shadow-[0_12px_28px_-14px_rgba(61,122,126,0.5)] sm:self-end">
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
