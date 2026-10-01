"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { useTilt } from "@/components/motion/useTilt";

const FRAME_ASPECT = 16 / 10;
const PAGE_WIDTH = 1200;

const tones = {
  cinnabar: "bg-[radial-gradient(110%_70%_at_100%_0%,rgba(236,61,32,0.3),transparent_60%)]",
  amber: "bg-[radial-gradient(110%_70%_at_100%_0%,rgba(255,164,92,0.24),transparent_60%)]",
} as const;

export function ProjectCard({ project }: { project: Project }) {
  const { rotateX, rotateY, handlers } = useTilt(4);
  const host = new URL(project.url).host;
  const frameRef = useRef<HTMLSpanElement>(null);

  /** Pointer height over the frame scrolls the real product page inside it. */
  const scroll = useMotionValue(0);
  const smooth = useSpring(scroll, { stiffness: 140, damping: 26, mass: 0.6 });
  const travel = (1 - PAGE_WIDTH / FRAME_ASPECT / project.page.height) * 100;
  const pageY = useTransform(smooth, (v) => `${-v * travel}%`);
  const railY = useTransform(smooth, (v) => `${v * 400}%`);

  return (
    <motion.a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      onPointerMove={(event) => {
        handlers.onPointerMove(event);
        const rect = frameRef.current?.getBoundingClientRect();
        if (!rect || event.pointerType !== "mouse") return;
        scroll.set(Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1));
      }}
      onPointerLeave={() => {
        handlers.onPointerLeave();
        scroll.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      className="group relative block h-full rounded-[1.75rem] p-px shadow-[0_40px_80px_-34px_rgba(70,30,15,0.45)] transition-shadow duration-700 hover:shadow-[0_60px_110px_-40px_rgba(70,30,15,0.6)] md:rounded-[2.25rem]"
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 via-white/[0.06] to-white/[0.02]" />
      <span aria-hidden="true" className="spotlight-border absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <span className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-cocoa text-cream md:rounded-[calc(2.25rem-1px)]">
        <span aria-hidden="true" className={`absolute inset-0 ${tones[project.tone]}`} />
        <span aria-hidden="true" className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <span className="relative flex flex-col p-7 md:p-10">
          <span className="flex items-start justify-between gap-6">
            <span className="block text-[clamp(2.1rem,3.6vw,3.25rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{project.name}</span>
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 transition-colors duration-500 group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
              <ArrowUpRight aria-hidden="true" className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
            </span>
          </span>
          <span className="mt-4 block max-w-md text-lg leading-relaxed text-cream/70">{project.description}</span>
          <span className="sr-only"> (opens {host} in a new tab)</span>
        </span>

        <span aria-hidden="true" className="relative mt-auto block px-7 pt-4 md:px-10 [perspective:1600px]">
          <span className="relative block origin-bottom transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)]:[transform:rotateX(7deg)_translateY(14px)] [@media(hover:hover)]:group-hover:[transform:rotateX(0deg)_translateY(0px)]">
            <span className="block overflow-hidden rounded-t-xl border border-b-0 border-white/15 bg-[#161210] shadow-[0_-24px_60px_-24px_rgba(236,61,32,0.4)]">
              <span className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5 font-mono text-[0.68rem] tracking-[0.08em] text-cream/55">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5fd38a]" />
                  <span className="truncate">{host}</span>
                </span>
                <span className="shrink-0 uppercase tracking-[0.14em] text-cream/35 transition-colors duration-500 max-sm:hidden [@media(hover:hover)]:group-hover:text-cream/70">
                  <span className="[@media(hover:hover)]:group-hover:hidden">{project.tags.join(" / ")}</span>
                  <span className="hidden [@media(hover:hover)]:group-hover:inline">Move to scroll</span>
                </span>
              </span>
              <span ref={frameRef} className="relative block aspect-[16/10] overflow-hidden">
                <motion.span style={{ y: pageY }} className="block will-change-transform">
                  <Image
                    src={project.page.src}
                    alt=""
                    width={PAGE_WIDTH}
                    height={project.page.height}
                    sizes="(min-width: 1024px) 40rem, 100vw"
                    className="block h-auto w-full"
                  />
                </motion.span>
                <span className="absolute inset-y-2 right-1.5 w-[3px] rounded-full bg-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <motion.span style={{ y: railY }} className="block h-1/5 w-full rounded-full bg-cinnabar" />
                </span>
              </span>
            </span>
          </span>
        </span>
      </span>
    </motion.a>
  );
}
