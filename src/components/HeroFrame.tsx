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
    <div className="hero-frame relative aspect-[4/5] w-full overflow-hidden bg-bg lg:aspect-auto lg:min-h-[36rem] lg:self-stretch">
      {showPoster ? (
        <Image
          src="/images/adewale-hero-poster.jpg"
          alt="Adewale Obadimu"
          fill
          priority
          sizes="(min-width: 1024px) 36rem, 100vw"
          className="object-cover object-[90%_center]"
        />
      ) : null}
      {playVideo ? (
        <video
          className="hero-video absolute inset-0 h-full w-full object-cover object-[90%_center]"
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-gradient-to-r from-bg to-transparent lg:block"
      />
    </div>
  );
}
