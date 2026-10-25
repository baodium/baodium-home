import { Reveal } from "@/components/Reveal";
import { SloWatchGame } from "@/components/SloWatchGame";

export function PlaySection() {
  return (
    <section id="play" aria-labelledby="play-heading" className="cream-band section">
      <Reveal wipe>
        <div className="shell">
          <h2 id="play-heading" className="sr-only">
            SLO Watch — reliability game
          </h2>
          <div className="text-ink-on-cream [&_.btn-primary]:bg-copper [&_.btn-secondary]:border-line-on-cream [&_.btn-secondary]:text-ink-on-cream [&_.slo-game]:text-ink-on-cream [&_.text-ink]:text-ink-on-cream [&_.text-muted]:text-muted-on-cream [&_.text-faint]:text-faint-on-cream [&_.text-bronze]:text-copper [&_.border-line]:border-line-on-cream [&_.bg-raise]:bg-[#1a1510] [&_.bg-raise]:text-[#f3efe8] [&_.bg-bg]:bg-[#0c0b0a] [&_.bg-line]:bg-line-on-cream">
            <SloWatchGame />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
