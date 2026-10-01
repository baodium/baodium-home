"use client";

import type { PointerEvent } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "motion/react";

/** Pointer-driven 3D tilt. Also writes --mx / --my (percent) on the element for spotlight and glare layers. */
export function useTilt(max = 6) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 180, damping: 18, mass: 0.6 });
  const rotateY = useSpring(ry, { stiffness: 180, damping: 18, mass: 0.6 });

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
    element.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
    if (reduce) return;
    ry.set((x - 0.5) * max * 2);
    rx.set(-(y - 0.5) * max * 2);
  };

  const onPointerLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return {
    rotateX,
    rotateY,
    rx,
    ry,
    handlers: { onPointerMove, onPointerLeave },
  };
}
