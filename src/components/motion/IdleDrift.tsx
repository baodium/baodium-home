"use client";

import { useEffect, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Soft autoplay oscillation mixed into pointer-driven MotionValues.
 * When the pointer is idle, the book (or any 3D subject) keeps breathing.
 */
export function useIdleDrift(
  pointerX: MotionValue<number>,
  pointerY: MotionValue<number>,
  {
    ampX = 0.12,
    ampY = 0.08,
    periodMs = 5200,
  }: { ampX?: number; ampY?: number; periodMs?: number } = {},
) {
  const reduce = usePrefersReducedMotion();
  const idleX = useMotionValue(0);
  const idleY = useMotionValue(0);
  const springX = useSpring(idleX, { stiffness: 40, damping: 18, mass: 0.6 });
  const springY = useSpring(idleY, { stiffness: 40, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduce) {
      idleX.set(0);
      idleY.set(0);
      return;
    }
    let frame = 0;
    let start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / periodMs;
      idleX.set(Math.sin(t * Math.PI * 2) * ampX);
      idleY.set(Math.cos(t * Math.PI * 2 * 0.85) * ampY);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, ampX, ampY, periodMs, idleX, idleY]);

  const x = useTransform([pointerX, springX], ([p, i]) => Number(p) + Number(i));
  const y = useTransform([pointerY, springY], ([p, i]) => Number(p) + Number(i));
  return { x, y };
}

/** Lightweight floating chip / glyph that loops without interaction. */
export function DriftChip({
  children,
  className = "",
  delay = 0,
  amp = 10,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amp?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className={className}
      animate={
        reduce
          ? undefined
          : {
              y: [0, -amp, amp * 0.4, 0],
              rotate: [0, -2.5, 1.8, 0],
            }
      }
      transition={
        reduce
          ? undefined
          : { duration: 6.5 + delay, repeat: Infinity, ease: "easeInOut", delay }
      }
    >
      {children}
    </motion.span>
  );
}
