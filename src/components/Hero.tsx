import fs from "node:fs";
import path from "node:path";
import { ArrowRight } from "lucide-react";
import { HeroFrame } from "@/components/HeroFrame";

const role =
  "block font-serif text-[clamp(2.85rem,4.7vw,4.75rem)] font-normal leading-[0.92] tracking-[-0.04em]";

export function Hero() {
  const hasVideo = fs.existsSync(path.join(process.cwd(), "public/media/adewale-hero.mp4"));
  const hasPoster = fs.existsSync(path.join(process.cwd(), "public/images/adewale-hero-poster.jpg"));

  return (
    <section className="bg-paper">
      <div className="lg:grid lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:py-16 lg:pl-[max(2.5rem,calc((100vw-76rem)/2))] lg:pr-16">
          <h1>
            <span className="block font-serif text-lg tracking-[-0.02em] md:text-xl">Adewale Obadimu</span>
            <span className={`seq d1 mt-4 ${role}`}>Engineer.</span>
            <span className={`seq d2 ${role}`}>Builder.</span>
            <span className={`seq d3 ${role}`}>Author.</span>
          </h1>
          <p className="seq d4 mt-6 max-w-[22rem] text-[1.05rem] leading-relaxed text-muted">
            I build software, systems, and products around reliability, infrastructure, AI, and how
            people work.
          </p>
          <div className="seq d4 mt-6">
            <a href="#work" className="inline-flex min-h-11 items-center gap-2 text-ink">
              <span className="border-b border-cinnabar pb-px">See the work</span>
              <ArrowRight aria-hidden="true" className="card-arrow h-4 w-4" strokeWidth={1.75} />
            </a>
          </div>
        </div>
        <div className="relative h-[min(78vh,36rem)] lg:h-auto">
          <HeroFrame hasVideo={hasVideo} hasPoster={hasPoster} />
        </div>
      </div>
    </section>
  );
}
