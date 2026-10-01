"use client";

import { ProjectCard } from "@/components/ProjectCard";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { projects } from "@/data/projects";

export function Projects() {
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="grain-light relative z-10 overflow-hidden rounded-t-[2rem] bg-cream pb-32 pt-28 text-ink md:rounded-t-[3.5rem] md:pb-44 md:pt-40"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[30%] h-[60vmax] w-[80vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,164,92,0.28),transparent)] blur-2xl" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={12}>
          <p className="kicker text-cinnabar">Work</p>
        </Reveal>
        <SplitHeading
          id="work-heading"
          text="Shipped, and live."
          accent={["live"]}
          className="mt-6 text-[clamp(2.75rem,6vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.055em]"
        />

        <div className="mt-16 grid gap-6 md:mt-24 lg:grid-cols-2 lg:gap-7">
          {ordered.map((project, index) => (
            <Reveal key={project.slug} delay={index * 0.1} >
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
