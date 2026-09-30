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
    cover.style.transform = `rotateX(${py * -5}deg) rotateY(${-14 + px * 8}deg)`;
  };

  const reset = () => {
    const cover = coverRef.current;
    if (!cover) return;
    cover.classList.remove("is-tracking");
    cover.style.transform = "";
  };

  const lines = book.title.split(" ");

  return (
    <div
      className="book-scene pr-5"
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <div ref={coverRef} className="book-object">
        <div className="book-pages" aria-hidden="true" />
        <div className="book-board">
          <p className="text-[0.62rem] tracking-[0.22em] text-bronze">BAODIUM</p>
          <div className="mt-auto">
            <p className="font-serif text-[clamp(1.85rem,3vw,2.35rem)] leading-[0.92] tracking-[-0.03em] text-ink">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="mt-5 max-w-[16rem] font-serif text-[0.95rem] italic leading-snug text-muted">
              {book.subtitle}
            </p>
          </div>
          <p className="mt-8 text-[0.75rem] tracking-wide text-faint">{book.author}</p>
        </div>
      </div>
    </div>
  );
}
