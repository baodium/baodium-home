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
  cinnabar: "bg-[#faf4f0]",
  amber: "bg-[#faf6f1]",
  tide: "bg-[#f0f6f6]",
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
  const idle = useMotionValue(0);
  useEffect(() => {
    if (reduce) {
      idle.set(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 9000;
      idle.set((Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * 0.18);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, idle]);
  const scroll = useTransform(() => {
    const hover = hovering.get();
    const frozen = still.get();
    const pointerT = pointer.get();
    const p = scrollYProgress.get();
    const origin = project.page.origin ?? 0;
    const along = Math.min(Math.max((p - 0.06) / 0.78, 0), 1);
    if (hover) return pointerT;
    if (frozen) return origin;
    return Math.min(1, origin + (1 - origin) * along + idle.get());
  });
  const smooth = useSpring(scroll, { stiffness: 340, damping: 38, mass: 0.24 });
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
      className="group relative block h-full rounded-[1.75rem] border border-ink/10 bg-white p-px shadow-[0_36px_72px_-36px_rgba(26,35,48,0.22)] transition-[border-color,box-shadow] duration-700 hover:border-ink/18 hover:shadow-[0_48px_90px_-40px_rgba(26,35,48,0.3)] md:rounded-[2.25rem]"
    >
      <span className={`relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] text-ink md:rounded-[calc(2.25rem-1px)] ${tones[project.tone]}`}>
        <span className="relative flex flex-col px-6 pb-5 pt-6 md:px-8 md:pb-6 md:pt-8">
          <span className="flex items-start justify-between gap-5">
            <span className="block text-[clamp(1.85rem,2.8vw,2.65rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{project.name}</span>
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/12 transition-colors duration-500 group-hover:border-transparent group-hover:bg-cinnabar group-hover:text-cream">
              <ArrowUpRight aria-hidden="true" className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
            </span>
          </span>
          <span className="mt-3 block max-w-md text-[0.98rem] leading-relaxed text-muted md:min-h-[3.4rem] md:text-[1.05rem]">{project.description}</span>
          <span className="sr-only"> (opens {host} in a new tab)</span>
        </span>

        <span aria-hidden="true" className="relative mt-auto block px-5 [perspective:1600px] md:px-7">
          <motion.span style={{ rotateX: frameTilt }} className="relative block origin-[50%_100%]">
            <span className="block overflow-hidden rounded-t-xl border border-b-0 border-ink/10 bg-white shadow-[0_-16px_40px_-28px_rgba(26,35,48,0.28)]">
              <span className="flex items-center justify-between gap-4 border-b border-ink/8 px-4 py-2.5 font-mono text-xs tracking-[0.04em] text-muted">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3d7a8c]" />
                  <span className="truncate">{host}</span>
                </span>
                <span className="hidden shrink-0 text-ink/55 [@media(hover:hover)]:group-hover:inline">
                  Scroll the live page ↕
                </span>
              </span>
              <span ref={frameRef} className="relative block aspect-[16/10] overflow-hidden bg-white">
                <motion.span style={{ y: pageY }} className="block will-change-transform">
                  <Image
                    src={project.page.src}
                    alt={`Full-page preview of ${project.name}`}
                    width={PAGE_WIDTH}
                    height={project.page.height}
                    sizes="(min-width: 1024px) 40rem, 100vw"
                    className="block h-auto w-full"
                    priority={project.featured}
                  />
                </motion.span>
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-white/90" />
                <span className="absolute inset-y-2 right-1.5 w-[3px] rounded-full bg-ink/10">
                  <motion.span style={{ y: railY }} className="block h-1/5 w-full rounded-full bg-cinnabar" />
                </span>
              </span>
            </span>
          </motion.span>
        </span>
      </span>
    </motion.a>
  );
}
