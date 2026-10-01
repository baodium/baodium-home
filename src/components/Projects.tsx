"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { useTilt } from "@/components/motion/useTilt";
import { projects } from "@/data/projects";
import { book } from "@/data/writing";

export function Projects() {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="grain-light relative z-10 overflow-hidden rounded-t-[2rem] bg-cream pb-24 pt-24 text-ink md:rounded-t-[3.5rem] md:pb-32 md:pt-36"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="aurora absolute -left-[15%] top-[-10%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(closest-side,rgba(255,164,92,0.38),transparent)] blur-2xl" />
        <div className="aurora-slow absolute -right-[20%] top-[25%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.2),transparent)] blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,12,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(14,12,11,0.05)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_30%,#000,transparent)]" />
      </div>

      <div className="shell relative z-[2]">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Reveal y={12}>
              <p className="kicker flex items-center gap-3 text-muted">
                <span className="text-cinnabar">(01)</span>
                <span className="h-px w-10 bg-ink/25" />
                Selected work
              </p>
            </Reveal>
            <SplitHeading
              id="work-heading"
              text="Products, shipped and live."
              accent={["live"]}
              className="mt-6 text-[clamp(2.75rem,7vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.055em]"
            />
          </div>
          <Reveal delay={0.2} className="md:col-span-4 md:pb-3">
            <p className="max-w-sm text-lg leading-relaxed text-muted">
              Two live products from the Baodium studio. Every card opens the real thing in a new tab.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 md:mt-20 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_auto] lg:gap-6">
          {featured.map((project) => (
            <Reveal key={project.slug} className="md:col-span-2 lg:col-span-7 lg:row-span-2">
              <ProjectCard project={project} featured />
            </Reveal>
          ))}
          {rest.map((project, index) => (
            <Reveal key={project.slug} delay={0.12 + index * 0.08} className="lg:col-span-5">
              <ProjectCard project={project} />
            </Reveal>
          ))}
          <Reveal delay={0.24} className="lg:col-span-5">
            <BookTile />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function BookTile() {
  const { rotateX, rotateY, handlers } = useTilt(7);
  return (
    <motion.a
      href="#book"
      {...handlers}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className="group relative flex h-full min-h-[15rem] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#ff8a55] via-cinnabar to-[#a3121d] p-6 text-white shadow-[0_40px_80px_-30px_rgba(216,38,43,0.7)] md:rounded-[2.25rem] md:p-9"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(400px_circle_at_var(--mx,70%)_var(--my,30%),rgba(255,255,255,0.28),transparent_45%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />
      <span className="relative z-[1] flex max-w-[60%] flex-col justify-between">
        <span className="kicker text-white/80">Also from the studio</span>
        <span>
          <span className="block text-[clamp(1.6rem,2.4vw,2.2rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            {book.title}
          </span>
          <span className="mt-4 inline-flex items-center gap-2 text-sm text-white/85">
            Meet the book
            <ArrowDown aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
          </span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="absolute -bottom-10 right-4 w-[38%] max-w-[11rem] rotate-[10deg] shadow-[0_30px_50px_-10px_rgba(0,0,0,0.55)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-4 group-hover:rotate-[4deg] md:right-8"
      >
        <Image
          src="/projects/practical-system-design.png"
          alt=""
          width={994}
          height={1500}
          sizes="11rem"
          className="h-auto w-full rounded-[3px]"
        />
      </span>
    </motion.a>
  );
}
