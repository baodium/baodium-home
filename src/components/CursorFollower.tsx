"use client";

import { useEffect, useRef } from "react";

export function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    const media = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!media.matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let currentX = x;
    let currentY = y;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
    };

    const tick = () => {
      currentX += (x - currentX) * 0.18;
      currentY += (y - currentY) * 0.18;
      dot.style.transform = `translate3d(${currentX - 6}px, ${currentY - 6}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={dotRef} aria-hidden="true" className="cursor-follower" />;
}
