"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { MotionConfig } from "motion/react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const lenis = new Lenis({
      lerp: 0.18,
      wheelMultiplier: 1,
      anchors: { offset: -88 },
      // Reader (and game panels) use nested overflow scrollers; without this
      // Lenis preventDefault on window.wheel leaves those panes stuck.
      allowNestedScroll: true,
      prevent: (node) =>
        node.id === "book-reader-scroll" ||
        Boolean(node.closest?.(".book-reader #book-reader-scroll, .book-reader .book-sidebar nav")),
    });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
