import { SloWatchGame } from "@/components/SloWatchGame";
import { Reveal } from "@/components/motion/Reveal";

export function PlaySection() {
  return (
    <section
      id="play"
      aria-labelledby="play-heading"
      className="relative bg-cream px-3 pb-14 pt-6 text-ink md:px-5 md:pb-20"
    >
      <Reveal y={12}>
        <div className="grain relative overflow-hidden rounded-[2rem] bg-ember px-5 py-10 text-cream md:rounded-[3rem] md:px-10 md:py-14">
          <div className="relative z-[2] mx-auto w-full max-w-[84rem]">
            <p className="kicker text-amber">Play · SLO Watch</p>
            <h2
              id="play-heading"
              className="mt-4 max-w-2xl font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.03em]"
            >
              Keep checkout inside the SLO.
            </h2>
            <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-cream/72">
              A reliability game from the book — size the pool, survive the spike, then read the
              chapter that teaches what just happened.
            </p>
            <div className="mt-8">
              <SloWatchGame embedded />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
