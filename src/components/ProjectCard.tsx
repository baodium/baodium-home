"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { useTilt } from "@/components/motion/useTilt";

const tones = {
  cinnabar: {
    wash: "bg-[radial-gradient(120%_80%_at_100%_0%,rgba(236,61,32,0.38),transparent_55%),radial-gradient(90%_70%_at_0%_100%,rgba(216,38,43,0.22),transparent_60%)]",
    pill: "text-[#ff8a5c]",
  },
  amber: {
    wash: "bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,164,92,0.32),transparent_55%),radial-gradient(90%_70%_at_0%_100%,rgba(236,61,32,0.16),transparent_60%)]",
    pill: "text-amber",
  },
} as const;

export function ProjectCard({ project, featured = false }: { project: Project; featured?: boolean }) {
  const tone = tones[project.tone];
  const { rotateX, rotateY, handlers } = useTilt(featured ? 4 : 6);
  const host = new URL(project.url).host;

  return (
    <motion.a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      {...handlers}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      className="group relative block h-full rounded-[1.75rem] p-px shadow-[0_40px_80px_-30px_rgba(40,20,10,0.55)] md:rounded-[2.25rem]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 via-white/[0.06] to-white/[0.02]"
      />
      <span
        aria-hidden="true"
        className="spotlight-border absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <span
        className={`relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-ink text-cream md:rounded-[calc(2.25rem-1px)] ${featured ? "min-h-[34rem] lg:min-h-[44rem]" : "min-h-[30rem]"}`}
      >
        <span aria-hidden="true" className={`absolute inset-0 ${tone.wash}`} />
        <span
          aria-hidden="true"
          className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        <span className={`relative flex flex-col p-6 md:p-9 ${featured ? "lg:p-11" : ""}`}>
          <span className="flex items-center justify-between gap-4">
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] backdrop-blur ${tone.pill}`}
              >
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" />
                {project.status}
              </span>
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-cream/55"
                >
                  {tag}
                </span>
              ))}
            </span>
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04] transition-colors duration-500 group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
              <ArrowUpRight
                aria-hidden="true"
                className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-45"
                strokeWidth={1.75}
              />
            </span>
          </span>

          <span
            className={`mt-8 block font-semibold tracking-[-0.045em] ${featured ? "text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[0.95]" : "text-[clamp(2rem,3.2vw,2.85rem)] leading-none"}`}
          >
            {project.name}
          </span>
          <span className={`mt-4 block max-w-md leading-relaxed text-cream/65 ${featured ? "text-lg" : ""}`}>
            {project.description}
          </span>
          <span className="sr-only"> (opens {host} in a new tab)</span>
        </span>

        <span aria-hidden="true" className="relative mt-auto block px-6 md:px-9 [perspective:1600px]">
          <span className="block origin-bottom transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:rotateX(9deg)_translateY(18px)] group-hover:[transform:rotateX(0deg)_translateY(0px)]">
            <span className="block overflow-hidden rounded-t-2xl border border-b-0 border-white/15 bg-[#1d1916] shadow-[0_-20px_60px_-20px_rgba(236,61,32,0.45)]">
              <span className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                </span>
                <span className="mx-auto rounded-full bg-white/[0.06] px-3 py-0.5 font-mono text-[0.68rem] text-cream/55">
                  {host}
                </span>
                <span className="w-10" />
              </span>
              <span className="relative block aspect-[16/10] overflow-hidden">
                <Image
                  src={project.image}
                  alt=""
                  fill
                  sizes={featured ? "(min-width: 1024px) 46rem, 100vw" : "(min-width: 1024px) 32rem, (min-width: 768px) 50vw, 100vw"}
                  className="object-cover object-top transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                />
                <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.22)_50%,transparent_65%)] bg-[length:250%_100%] bg-[position:120%_0] transition-[background-position] duration-[1.2s] ease-out group-hover:bg-[position:-20%_0]" />
              </span>
            </span>
          </span>
        </span>
      </span>
    </motion.a>
  );
}
