"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { useTilt } from "@/components/motion/useTilt";

const tones = {
  cinnabar: "bg-[radial-gradient(110%_70%_at_100%_0%,rgba(236,61,32,0.32),transparent_60%)]",
  amber: "bg-[radial-gradient(110%_70%_at_100%_0%,rgba(255,164,92,0.24),transparent_60%)]",
} as const;

export function ProjectCard({ project, index, featured = false }: { project: Project; index: number; featured?: boolean }) {
  const { rotateX, rotateY, handlers } = useTilt(featured ? 4 : 5);
  const host = new URL(project.url).host;

  return (
    <motion.a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      {...handlers}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      className="group relative block h-full rounded-[1.75rem] p-px shadow-[0_40px_80px_-34px_rgba(40,20,10,0.55)] transition-shadow duration-700 hover:shadow-[0_60px_110px_-40px_rgba(40,20,10,0.7)] md:rounded-[2.25rem]"
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 via-white/[0.06] to-white/[0.02]" />
      <span aria-hidden="true" className="spotlight-border absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <span
        className={`relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-ink text-cream md:rounded-[calc(2.25rem-1px)] ${featured ? "min-h-[32rem] lg:min-h-[40rem]" : "min-h-[30rem] lg:min-h-[40rem]"}`}
      >
        <span aria-hidden="true" className={`absolute inset-0 ${tones[project.tone]}`} />
        <span aria-hidden="true" className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <span className={`relative flex flex-col p-6 md:p-9 ${featured ? "lg:p-11" : ""}`}>
          <span className="flex items-start justify-between gap-6">
            <span
              className={`block font-semibold tracking-[-0.045em] ${featured ? "text-[clamp(2.4rem,4.4vw,4rem)] leading-[0.95]" : "text-[clamp(2rem,3vw,2.75rem)] leading-none"}`}
            >
              <span aria-hidden="true" className="mb-4 block font-mono text-xs font-normal tracking-[0.14em] text-cream/40">
                0{index + 1}
              </span>
              {project.name}
            </span>
            <span className="relative mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 transition-colors duration-500 group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
              <ArrowUpRight aria-hidden="true" className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
            </span>
          </span>
          <span className={`mt-4 block max-w-md leading-relaxed text-cream/65 ${featured ? "text-lg" : ""}`}>{project.description}</span>
          <span className="sr-only"> (opens {host} in a new tab)</span>
        </span>

        <span aria-hidden="true" className="relative mt-auto block px-6 pt-10 md:px-9 [perspective:1600px]">
          <span className="relative block origin-bottom transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)]:[transform:rotateX(8deg)_translateY(16px)] [@media(hover:hover)]:group-hover:[transform:rotateX(0deg)_translateY(0px)]">
            <span className="instrument-tick -left-2.5 -top-2.5 border-l border-t group-hover:-left-4 group-hover:-top-4" />
            <span className="instrument-tick -right-2.5 -top-2.5 border-r border-t group-hover:-right-4 group-hover:-top-4" />
            <span className="block overflow-hidden rounded-t-xl border border-b-0 border-white/15 bg-[#161210] shadow-[0_-24px_60px_-24px_rgba(236,61,32,0.45)]">
              <span className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5 font-mono text-[0.68rem] tracking-[0.08em] text-cream/55">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#5fd38a]" />
                  <span className="truncate">{host}</span>
                </span>
                <span className="shrink-0 uppercase tracking-[0.14em] text-cream/35 max-sm:hidden">{project.tags.join(" / ")}</span>
              </span>
              <span className="relative block aspect-[16/10] overflow-hidden">
                <Image
                  src={project.image}
                  alt=""
                  fill
                  sizes={featured ? "(min-width: 1024px) 46rem, 100vw" : "(min-width: 1024px) 32rem, 100vw"}
                  className="object-cover object-top transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
                <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:250%_100%] bg-[position:120%_0] transition-[background-position] duration-[1.2s] ease-out group-hover:bg-[position:-20%_0]" />
              </span>
            </span>
          </span>
        </span>
      </span>
    </motion.a>
  );
}
