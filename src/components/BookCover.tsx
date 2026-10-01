"use client";

import { useRef, type PointerEvent } from "react";
import { book } from "@/data/writing";

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
    cover.style.transform = `rotateX(${4 + py * -6}deg) rotateY(${-16 + px * 8}deg)`;
  };

  const reset = () => {
    const cover = coverRef.current;
    if (!cover) return;
    cover.classList.remove("is-tracking");
    cover.style.transform = "";
  };

  return (
    <div className="book-scene pr-6" onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      <div ref={coverRef} className="book-object">
        <div className="book-pages" aria-hidden="true" />
        <div className="book-board">
          <p className="text-[0.62rem] tracking-[0.24em] text-[#e8c56a]">BAODIUM</p>
          <div className="mt-auto">
            <p className="font-serif text-[clamp(1.9rem,3vw,2.45rem)] leading-[0.9] tracking-[-0.03em]">
              {book.title.split(" ").map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <span aria-hidden="true" className="mt-5 block h-px w-14 bg-cinnabar" />
            <p className="mt-4 max-w-[15rem] font-serif text-[0.98rem] italic leading-snug text-cream/75">
              {book.subtitle}
            </p>
          </div>
          <p className="mt-8 text-[0.75rem] tracking-wide text-cream/70">{book.author}</p>
        </div>
      </div>
    </div>
  );
}
