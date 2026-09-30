import fs from "node:fs";
import path from "node:path";
import { HeroFrame } from "@/components/HeroFrame";
import { MagneticLink } from "@/components/MagneticLink";

const roleClass =
  "block font-serif text-[clamp(3.35rem,7.1vw,6.5rem)] font-normal leading-[0.88] tracking-[-0.035em]";

export function Hero() {
  const hasVideo = fs.existsSync(
    path.join(process.cwd(), "public/media/adewale-hero.mp4"),
  );
  const hasPoster = fs.existsSync(
    path.join(process.cwd(), "public/images/adewale-hero-poster.jpg"),
  );

  return (
    <section className="pb-20 pt-16 md:pt-20 lg:flex lg:min-h-[calc(100svh-4.5rem)] lg:items-center lg:py-12">
      <div className="shell grid items-center gap-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(240px,0.74fr)] lg:gap-20">
        <div>
          <h1>
            <span className="block font-serif text-[1.05rem] uppercase tracking-[0.16em] md:text-[1.15rem]">
              Adewale Obadimu
            </span>
            <span className="mt-6 block h-px w-12 bg-bronze" aria-hidden="true" />
            <span className={`seq d2 mt-8 ${roleClass}`}>Engineer.</span>
            <span className={`seq d3 ${roleClass}`}>Builder.</span>
            <span className={`seq d4 ${roleClass}`}>Author.</span>
          </h1>
          <p className="seq d45 mt-8 max-w-md text-[1.05rem] leading-relaxed text-muted">
            I build software, systems, and products around reliability, infrastructure,
            AI, and how people work.
          </p>
          <div className="seq d45 mt-10">
            <MagneticLink href="#work" className="text-[0.98rem] text-ink">
              <span className="border-b border-current pb-px">Explore my work</span>
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </MagneticLink>
          </div>
          <p className="seq d6 mt-14 text-[0.72rem] tracking-[0.28em] text-faint">BAODIUM</p>
        </div>
        <div className="flex justify-end lg:justify-self-end">
          <div className="w-[min(74%,17.5rem)] lg:w-full lg:max-w-[26rem]">
            <HeroFrame hasVideo={hasVideo} hasPoster={hasPoster} />
          </div>
        </div>
      </div>
    </section>
  );
}
