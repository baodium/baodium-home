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
    <div className="relative h-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
      <div className="relative aspect-[4/5] w-full lg:aspect-auto lg:h-full lg:min-h-[34rem]">
        {showPoster ? (
          <Image
            src="/images/adewale-hero-poster.jpg"
            alt="Adewale Obadimu"
            fill
            priority
            sizes="(min-width: 1024px) 38rem, 100vw"
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
        <span aria-hidden="true" className="absolute top-3 left-3 h-7 w-7 border-t-2 border-l-2 border-cinnabar" />
        <span aria-hidden="true" className="absolute top-3 right-3 h-7 w-7 border-t-2 border-r-2 border-brass" />
        <span aria-hidden="true" className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-brass" />
        <span aria-hidden="true" className="absolute right-3 bottom-3 h-7 w-7 border-r-2 border-b-2 border-cinnabar" />
      </div>
    </div>
  );
}
