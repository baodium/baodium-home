"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/motion/Reveal";
import { projects, type Project } from "@/data/projects";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));

export function SideProjectsView() {
  const reduce = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mistY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 100]);
  const mistOpacity = useTransform(scrollYProgress, [0, 0.85], reduce ? [1, 1] : [1, 0.3]);
  const titleY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 36]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], reduce ? [1, 1] : [1, 0.55]);

  return (
    <div className="relative overflow-hidden bg-cream text-ink">
      <section
        ref={heroRef}
        aria-labelledby="side-projects-heading"
        className="relative isolate overflow-hidden bg-night pb-16 pt-28 text-cream md:pb-24 md:pt-36"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <motion.div
            style={{ y: mistY, opacity: mistOpacity }}
            className="absolute inset-0 bg-[#1a2a2e]"
          />
          {!reduce ? (
            <span className="absolute inset-x-[12%] top-[38%] h-px overflow-hidden opacity-60">
              <span className="signal-scan block h-full w-1/3 bg-tide-soft/70" />
            </span>
          ) : null}
          <div className="grain absolute inset-0 opacity-40 mix-blend-soft-light" />
        </div>

        <motion.div style={{ y: titleY, opacity: titleOpacity }} className="shell relative z-[2]">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.05, ease }}
            className="kicker text-tide-soft"
          >
            Projects
          </motion.p>

          <h1
            id="side-projects-heading"
            className="mt-5 max-w-[14ch] text-balance text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-cream"
          >
            Interview Coach{" "}
            <span className="font-serif font-normal italic text-flame">and</span>{" "}
            UpTo.
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.75, delay: reduce ? 0 : 0.28, ease }}
            className="mt-6 max-w-xl font-serif text-[clamp(1.1rem,1.7vw,1.35rem)] italic leading-snug text-cream/70"
          >
            Interview practice that follows your answers, and a status page that
            stays true across every profile.
          </motion.p>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : 0.36, ease }}
            className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-cream/55"
          >
            Open either product, or scroll through a full-page preview of each.
          </motion.p>

          <motion.ul
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.42, ease }}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-3"
          >
            {ordered.map((project, index) => (
              <li key={project.slug}>
                <a
                  href={`#${project.slug}`}
                  className="group inline-flex min-h-10 items-center gap-2.5 text-[0.95rem] text-cream/70 transition-colors hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber"
                >
                  <span className="font-mono text-[0.72rem] tracking-[0.14em] text-amber/80">
                    0{index + 1}
                  </span>
                  {project.name}
                  <span
                    aria-hidden="true"
                    className="h-px w-0 bg-cream/40 transition-[width] duration-500 group-hover:w-6"
                  />
                </a>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      <section aria-label="Project showcases" className="relative pb-20 pt-4 md:pb-28 md:pt-8">
        <div className="shell relative z-[2] space-y-16 md:space-y-24">
          {ordered.map((project, index) => (
            <ProjectFeature key={project.slug} project={project} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProjectFeature({ project, index }: { project: Project; index: number }) {
  const reduce = usePrefersReducedMotion();
  const host = new URL(project.url).host;
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.9", "start 0.35"],
  });
  const rule = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.12, 1]);
  const glow = useTransform(scrollYProgress, [0, 1], reduce ? [0.35, 0.35] : [0.15, 0.55]);
  const stageY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [28, 0]);
  const stageOpacity = useTransform(scrollYProgress, [0, 0.55], reduce ? [1, 1] : [0.45, 1]);
  const cardY = useTransform(scrollYProgress, [0.15, 1], reduce ? [0, 0] : [36, 0]);

  return (
    <article
      ref={sectionRef}
      id={project.slug}
      className="scroll-mt-28"
      aria-labelledby={`${project.slug}-heading`}
    >
      <motion.div style={{ y: stageY, opacity: stageOpacity }}>
        <Reveal y={16}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <p className="kicker text-cinnabar">0{index + 1}</p>
                <motion.span
                  aria-hidden="true"
                  style={{ scaleX: rule, opacity: glow }}
                  className="h-px origin-left flex-1 bg-cinnabar/45"
                />
              </div>
              <h2
                id={`${project.slug}-heading`}
                className="mt-3 text-[clamp(2rem,4vw,3.1rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-ink"
              >
                {project.name}
              </h2>
              <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-muted md:text-[1.12rem]">
                {project.description}
              </p>
            </div>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-line group min-h-11 px-5 text-[0.92rem]"
          >
            Open {host}
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          </div>
        </Reveal>
      </motion.div>

      <motion.div style={{ y: cardY }}>
        <Reveal delay={0.08} y={22}>
          <div className="relative">
            <ProjectCard project={project} />
          </div>
        </Reveal>
      </motion.div>
    </article>
  );
}
