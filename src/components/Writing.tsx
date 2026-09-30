import { BookCover } from "@/components/BookCover";
import { Reveal } from "@/components/Reveal";

export function Writing() {
  return (
    <section id="writing" aria-labelledby="writing-heading" className="section">
      <Reveal>
        <div className="shell grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2
              id="writing-heading"
              className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze"
            >
              Writing
            </h2>
            <p className="mt-8 text-[0.72rem] uppercase tracking-[0.18em] text-faint">Book</p>
            <h3 className="mt-4 max-w-xl font-serif text-4xl leading-[1.02] tracking-[-0.03em] md:text-6xl">
              Practical System Design
            </h3>
            <p className="mt-5 max-w-md font-serif text-xl italic leading-snug text-muted md:text-2xl">
              Building Reliable Systems Through Production Failures
            </p>
            <p className="mt-6 text-sm text-ink">Adewale Obadimu</p>
            <p className="mt-8 max-w-md leading-relaxed text-muted">
              Production system design told through fourteen incidents and the decisions
              behind them.
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end">
            <div className="w-[min(100%,15.5rem)] lg:w-[min(100%,19rem)]">
              <BookCover />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
