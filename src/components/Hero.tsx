import fs from "node:fs";
import path from "node:path";
import { HeroFrame } from "@/components/HeroFrame";

const roleClass =
  "block font-serif text-[clamp(3.15rem,6.1vw,5.6rem)] font-normal leading-[0.88] tracking-[-0.035em]";

export function Hero() {
  const hasVideo = fs.existsSync(
    path.join(process.cwd(), "public/media/adewale-hero.mp4"),
  );
  const hasPoster = fs.existsSync(
    path.join(process.cwd(), "public/images/adewale-hero-poster.jpg"),
  );

  return (
    <section className="pb-8 pt-8 md:pt-10">
      <div className="shell grid items-end gap-10 lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[minmax(0,1.12fr)_minmax(17rem,0.78fr)] lg:gap-x-16 lg:pb-8">
        <div className="lg:pb-4">
          <h1>
            <span className="block font-serif text-[1.15rem] uppercase tracking-[0.14em] text-ink md:text-[1.25rem]">
              Adewale Obadimu
            </span>
            <span className="mt-6 block h-px w-12 bg-bronze" aria-hidden="true" />
            <span className={`seq d1 mt-8 ${roleClass}`}>Engineer.</span>
            <span className={`seq d2 ${roleClass}`}>Builder.</span>
            <span className={`seq d3 ${roleClass}`}>Author.</span>
          </h1>
          <p className="seq d4 mt-8 max-w-md text-[1.05rem] leading-relaxed text-muted">
            I build software, systems, and products around reliability, infrastructure,
            AI, and how people work.
          </p>
          <div className="seq d4 mt-8">
            <a href="#work" className="inline-flex min-h-11 items-center text-[0.98rem] text-ink">
              <span className="border-b border-current pb-px">Explore my work</span>
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </a>
          </div>
        </div>
        <HeroFrame hasVideo={hasVideo} hasPoster={hasPoster} />
      </div>
    </section>
  );
}
