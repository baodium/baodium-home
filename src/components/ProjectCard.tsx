"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { useTilt } from "@/components/motion/useTilt";

const FRAME_ASPECT = 16 / 10;
const PAGE_WIDTH = 1200;

const tones = {
  cinnabar: "bg-[radial-gradient(110%_70%_at_100%_0%,rgba(173,79,54,0.3),transparent_60%)]",
  amber: "bg-[radial-gradient(110%_70%_at_100%_0%,rgba(222,162,124,0.24),transparent_60%)]",
} as const;

export function ProjectCard({ project }: { project: Project }) {
  const { rotateX, rotateY, handlers } = useTilt(4);
  const host = new URL(project.url).host;
  const frameRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const reduce = usePrefersReducedMotion();

  /**
   * The frame shows the real product page. Scrolling past drifts it a little way down the page;
   * a mouse over the frame takes over and travels the whole page.
   */
  const { scrollYProgress } = useScroll({ target: cardRef, offset: ["start end", "end start"] });
  const still = useMotionValue(0);
  useEffect(() => still.set(reduce ? 1 : 0), [reduce, still]);
  const pointer = useMotionValue(0);
  const hovering = useMotionValue(0);
  const scroll = useTransform(() => {
    const hover = hovering.get();
    const frozen = still.get();
    const pointerT = pointer.get();
    const p = scrollYProgress.get();
    if (hover) return pointerT;
    if (frozen) return 0;
    return Math.min(Math.max((p - 0.02) / 0.8, 0), 1) * 0.84;
  });
  const smooth = useSpring(scroll, { stiffness: 170, damping: 28, mass: 0.42 });
  const restTilt = useTransform(scrollYProgress, [0.05, 0.42, 0.86], reduce ? [0, 0, 0] : [5, 0, 2]);
  const frameTilt = useTransform(() => (hovering.get() ? 0 : restTilt.get()));
  const travel = (1 - PAGE_WIDTH / FRAME_ASPECT / project.page.height) * 100;
  const pageY = useTransform(smooth, (v) => `${-v * travel}%`);
  const railY = useTransform(smooth, (v) => `${v * 400}%`);

  return (
    <motion.a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      ref={cardRef}
      onPointerMove={(event) => {
        handlers.onPointerMove(event);
        const rect = frameRef.current?.getBoundingClientRect();
        if (!rect || event.pointerType !== "mouse") return;
        // The top and bottom tenth of the frame hold the ends, so both are easy to land on.
        pointer.set(Math.min(Math.max(((event.clientY - rect.top) / rect.height - 0.1) / 0.8, 0), 1));
        hovering.set(1);
      }}
      onPointerLeave={() => {
        handlers.onPointerLeave();
        hovering.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      className="group relative block h-full rounded-[1.75rem] p-px shadow-[0_40px_80px_-34px_rgba(70,30,15,0.45)] transition-shadow duration-700 hover:shadow-[0_60px_110px_-40px_rgba(70,30,15,0.6)] md:rounded-[2.25rem]"
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 via-white/[0.06] to-white/[0.02]" />
      <span aria-hidden="true" className="spotlight-border absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <span className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-[#403229] text-cream md:rounded-[calc(2.25rem-1px)]">
        <span aria-hidden="true" className={`absolute inset-0 ${tones[project.tone]}`} />
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(90%_60%_at_0%_0%,rgba(243,214,190,0.1),transparent_60%)]" />
        <span aria-hidden="true" className="spotlight absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <span className="relative flex flex-col px-6 pb-5 pt-6 md:px-8 md:pb-6 md:pt-8">
          <span className="flex items-start justify-between gap-5">
            <span className="block text-[clamp(1.85rem,2.8vw,2.65rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{project.name}</span>
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 transition-colors duration-500 group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
              <ArrowUpRight aria-hidden="true" className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
            </span>
          </span>
          <span className="mt-3 block max-w-md text-[0.98rem] leading-relaxed text-cream/78 md:text-[1.05rem]">{project.description}</span>
          <span className="sr-only"> (opens {host} in a new tab)</span>
        </span>

        <span aria-hidden="true" className="relative mt-auto block px-5 [perspective:1600px] md:px-7">
          <motion.span style={{ rotateX: frameTilt }} className="relative block origin-[50%_100%]">
            <span className="block overflow-hidden rounded-t-xl border border-b-0 border-white/15 bg-[#2a211c] shadow-[0_-20px_50px_-28px_rgba(173,79,54,0.55)]">
              <span className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5 font-mono text-xs tracking-[0.04em] text-cream/60">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8cc49a]" />
                  <span className="truncate">{host}</span>
                </span>
                <span className="hidden shrink-0 text-cream/70 [@media(hover:hover)]:group-hover:inline">Move to scroll ↕</span>
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
                <span className="absolute inset-y-2 right-1.5 w-[3px] rounded-full bg-white/15">
                  <motion.span style={{ y: railY }} className="block h-1/5 w-full rounded-full bg-cinnabar shadow-[0_0_10px_rgba(173,79,54,0.65)]" />
                </span>
              </span>
            </span>
          </motion.span>
        </span>
      </span>
    </motion.a>
  );
}
