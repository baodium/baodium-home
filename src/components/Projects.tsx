"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/motion/Reveal";
import { projects } from "@/data/projects";

export function Projects() {
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <section
      id="products"
      aria-labelledby="products-heading"
      className="relative overflow-hidden bg-cream pb-14 pt-8 text-ink md:pb-20 md:pt-12"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[22%] h-[46vmax] w-[72vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(222,162,124,0.28),transparent)] blur-2xl" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={12}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <h2 id="products-heading" className="kicker text-cinnabar">
                Products
              </h2>
              <span
                aria-hidden="true"
                className="h-px flex-1 bg-gradient-to-r from-cinnabar/30 to-transparent"
              />
            </div>
            {/* Compact Project destination (Experience lab) — not a full homepage section. */}
            <Link
              href="/system-design/experience"
              className="group inline-flex min-h-10 shrink-0 items-center gap-1.5 text-[0.88rem] text-muted transition-colors hover:text-cinnabar"
            >
              Project
              <ArrowUpRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <p className="mt-4 max-w-xl font-serif text-[clamp(1.35rem,2.2vw,1.75rem)] italic leading-snug tracking-[-0.02em] text-ink/80">
            Live tools — interview practice and a status page that stays true.
          </p>
        </Reveal>

        <div className="mt-6 grid gap-8 md:mt-8 lg:grid-cols-2 lg:gap-6">
          {ordered.map((project, index) => (
            <Reveal key={project.slug} delay={index * 0.12} y={22}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
