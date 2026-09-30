"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";
import { useHeroMotionOk } from "@/lib/motion-prefs";

function allowParallax(event: { pointerType: string }) {
  if (event.pointerType !== "mouse") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroFrame({
  hasVideo,
  hasPoster,
}: {
  hasVideo: boolean;
  hasPoster: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const motionOk = useHeroMotionOk();
  const playVideo = hasVideo && motionOk;
  const showPoster = hasPoster && !playVideo;

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame || !allowParallax(event)) return;
    const rect = frame.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    frame.classList.add("is-tracking");
    frame.style.transform = `translate3d(${px * 10}px, ${py * 8}px, 0)`;
  };

  const reset = () => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.classList.remove("is-tracking");
    frame.style.transform = "translate3d(0, 0, 0)";
  };

  return (
    <div
      ref={frameRef}
      className="hero-frame relative aspect-[4/5] overflow-hidden border border-line bg-raise"
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {showPoster ? (
        <Image
          src="/images/adewale-hero-poster.jpg"
          alt="Adewale Obadimu"
          fill
          priority
          sizes="(min-width: 1024px) 26rem, 70vw"
          className="object-cover object-[72%_center]"
        />
      ) : null}
      {playVideo ? (
        <video
          className="hero-video absolute inset-0 h-full w-full object-cover object-[72%_center] opacity-0 transition-opacity duration-700 data-ready:opacity-100"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={hasPoster ? "/images/adewale-hero-poster.jpg" : undefined}
          aria-label="Adewale Obadimu"
          onCanPlay={(event) => {
            event.currentTarget.dataset.ready = "";
          }}
        >
          <source src="/media/adewale-hero.mp4" type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
