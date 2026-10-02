"use client";

import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/motion/Reveal";
import { projects } from "@/data/projects";

export function Projects() {
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="relative overflow-hidden bg-cream pb-28 pt-24 text-ink md:pb-36 md:pt-36"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[30%] h-[60vmax] w-[80vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.28),transparent)] blur-2xl" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={12}>
          <h2 id="work-heading" className="kicker text-cinnabar">Work</h2>
        </Reveal>

        <div className="mt-8 grid gap-6 md:mt-10 lg:grid-cols-2 lg:gap-7">
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
