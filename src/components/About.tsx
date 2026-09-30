import { Reveal } from "@/components/Reveal";

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="section">
      <Reveal>
        <div className="shell grid gap-8 lg:grid-cols-12">
          <h2
            id="about-heading"
            className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze lg:col-span-4"
          >
            About
          </h2>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-xl font-serif text-3xl leading-snug tracking-[-0.02em] md:text-4xl">
              Adewale Obadimu is a reliability engineer, technical leader, builder, and
              author.
            </p>
            <p className="mt-8 max-w-xl leading-relaxed text-muted">
              He is currently building at the intersection of AI, software engineering,
              reliability, and how people work.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
