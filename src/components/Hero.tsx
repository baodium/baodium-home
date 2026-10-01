import fs from "node:fs";
import path from "node:path";
import { ArrowRight } from "lucide-react";
import { HeroFrame } from "@/components/HeroFrame";

const roleClass =
  "block font-serif text-[clamp(3.5rem,7.2vw,6.6rem)] font-normal leading-[0.86] tracking-[-0.04em]";

export function Hero() {
  const hasVideo = fs.existsSync(path.join(process.cwd(), "public/media/adewale-hero.mp4"));
  const hasPoster = fs.existsSync(path.join(process.cwd(), "public/images/adewale-hero-poster.jpg"));

  return (
    <section className="relative overflow-hidden bg-paper">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-8 h-[28rem] w-[28rem] text-cinnabar/25"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="180" cy="190" r="150" stroke="currentColor" strokeWidth="1" />
        <circle cx="180" cy="190" r="96" stroke="currentColor" strokeWidth="1" />
        <path d="M20 310 H340" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div className="shell relative grid items-stretch gap-8 py-8 lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-12 lg:gap-0 lg:py-0">
        <div className="relative z-10 flex flex-col justify-end pb-2 lg:col-span-7 lg:py-16 lg:pr-14">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-moss">Studio</p>
          <h1 className="mt-6">
            <span className="block font-serif text-[1.2rem] uppercase tracking-[0.12em] md:text-[1.35rem]">
              Adewale Obadimu
            </span>
            <span className={`seq d1 mt-6 ${roleClass}`}>Engineer.</span>
            <span className={`seq d2 ${roleClass}`}>Builder.</span>
            <span className={`seq d3 italic text-cinnabar ${roleClass}`}>Author.</span>
          </h1>
          <p className="seq d4 mt-8 max-w-md text-[1.08rem] leading-relaxed text-muted">
            I build software, systems, and products around reliability, infrastructure,
            AI, and how people work.
          </p>
          <div className="seq d4 mt-8">
            <a href="#work" className="inline-flex min-h-11 items-center gap-2 text-[1rem] text-ink">
              <span className="border-b-2 border-cinnabar pb-px">Explore my work</span>
              <ArrowRight aria-hidden="true" className="card-arrow h-4 w-4" strokeWidth={1.75} />
            </a>
          </div>
        </div>
        <div className="bleed-kiln relative bg-kiln lg:col-span-5">
          <div className="relative z-10">
            <HeroFrame hasVideo={hasVideo} hasPoster={hasPoster} />
          </div>
        </div>
      </div>
    </section>
  );
}
