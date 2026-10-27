"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { projects } from "@/data/projects";

/** Compact homepage bridge to the dedicated side-projects page — not a product gallery. */
export function Projects() {
  const names = projects.map((project) => project.name).join(" · ");

  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="relative overflow-hidden bg-cream py-10 text-ink md:py-14"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[28vmax] w-[56vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.22),transparent)] blur-2xl" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={10}>
          <Link
            href="/projects"
            className="group flex flex-col gap-3 rounded-[1.25rem] border border-ink/[0.07] bg-white/40 px-5 py-5 transition-[border-color,background-color,transform] duration-500 hover:border-cinnabar/25 hover:bg-white/70 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-7 sm:py-6 md:rounded-[1.5rem]"
          >
            <div className="min-w-0">
              <p className="kicker text-cinnabar">Recent side projects</p>
              <h2
                id="projects-heading"
                className="mt-2 font-serif text-[clamp(1.45rem,2.4vw,1.9rem)] italic leading-snug tracking-[-0.02em] text-ink"
              >
                {names}
              </h2>
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-[0.95rem] font-medium text-cinnabar transition-colors group-hover:text-crimson sm:self-center">
              View projects
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2}
              />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
