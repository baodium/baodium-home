"use client";

import Image from "next/image";
import { useHeroMotionOk } from "@/lib/motion-prefs";

export function HeroFrame({
  hasVideo,
  hasPoster,
}: {
  hasVideo: boolean;
  hasPoster: boolean;
}) {
  const motionOk = useHeroMotionOk();
  const playVideo = hasVideo && motionOk;
  const showPoster = hasPoster && !playVideo;

  return (
    <div className="absolute inset-0 bg-ink">
      {showPoster ? (
        <Image
          src="/images/adewale-hero-poster.jpg"
          alt="Adewale Obadimu"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[86%_42%]"
        />
      ) : null}
      {playVideo ? (
        <video
          className="hero-video absolute inset-0 h-full w-full object-cover object-[86%_42%]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={hasPoster ? "/images/adewale-hero-poster.jpg" : undefined}
          aria-label="Adewale Obadimu"
        >
          <source src="/media/adewale-hero.mp4" type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
