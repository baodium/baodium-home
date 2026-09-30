"use client";

import { useRef, type PointerEvent } from "react";

function allowTilt(event: { pointerType: string }) {
  if (event.pointerType !== "mouse") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BookCover() {
  const coverRef = useRef<HTMLDivElement>(null);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const cover = coverRef.current;
    if (!cover || !allowTilt(event)) return;
    const rect = cover.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    cover.classList.add("is-tracking");
    cover.style.transform = `rotateX(${py * -7}deg) rotateY(${px * 8}deg)`;
  };

  const reset = () => {
    const cover = coverRef.current;
    if (!cover) return;
    cover.classList.remove("is-tracking");
    cover.style.transform = "rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div className="[perspective:1100px]" onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <div
        ref={coverRef}
        className="book-face shadow-[0_22px_50px_rgba(0,0,0,0.45)]"
      >
        <svg viewBox="0 0 360 540" className="h-auto w-full" role="img" aria-label="Typographic cover of Practical System Design">
          <rect width="360" height="540" fill="#16130f" />
          <rect width="8" height="540" fill="#c4a27a" />
          <text
            x="32"
            y="58"
            fill="#c4a27a"
            fontSize="11"
            letterSpacing="3.2"
            fontFamily="var(--font-geist), sans-serif"
          >
            BAODIUM
          </text>
          <text
            x="32"
            y="210"
            fill="#f3efe8"
            fontSize="42"
            fontFamily="var(--font-newsreader), Palatino, serif"
          >
            Practical
          </text>
          <text
            x="32"
            y="258"
            fill="#f3efe8"
            fontSize="42"
            fontFamily="var(--font-newsreader), Palatino, serif"
          >
            System
          </text>
          <text
            x="32"
            y="306"
            fill="#f3efe8"
            fontSize="42"
            fontFamily="var(--font-newsreader), Palatino, serif"
          >
            Design
          </text>
          <text
            x="32"
            y="352"
            fill="#a39b92"
            fontSize="14"
            fontStyle="italic"
            fontFamily="var(--font-newsreader), Palatino, serif"
          >
            Building Reliable Systems
          </text>
          <text
            x="32"
            y="372"
            fill="#a39b92"
            fontSize="14"
            fontStyle="italic"
            fontFamily="var(--font-newsreader), Palatino, serif"
          >
            Through Production Failures
          </text>
          <line x1="32" y1="470" x2="120" y2="470" stroke="#c4a27a" strokeWidth="1" />
          <text
            x="32"
            y="498"
            fill="#8a827a"
            fontSize="12"
            fontFamily="var(--font-geist), sans-serif"
          >
            Adewale Obadimu
          </text>
        </svg>
      </div>
    </div>
  );
}
