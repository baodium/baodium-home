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
      className="relative overflow-hidden bg-cream pb-16 pt-12 text-ink md:pb-24 md:pt-16"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-[50vmax] w-[78vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.34),transparent)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#f3e6d6]/80" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={12}>
          <div className="flex items-center gap-4">
            <h2 id="work-heading" className="kicker text-cinnabar">Work</h2>
            <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-cinnabar/35 to-transparent" />
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-2 lg:gap-6">
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
