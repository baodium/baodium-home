import { Mark } from "@/components/Mark";
import { Reveal } from "@/components/Reveal";

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="section bg-kiln text-cream">
      <Reveal>
        <div className="shell grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Mark index="05" title="About" id="about-heading" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="max-w-xl font-serif text-3xl leading-snug tracking-[-0.03em] md:text-[2.6rem] md:leading-[1.15]">
              Adewale Obadimu is a reliability engineer, technical leader, builder, and author.
            </p>
            <p className="mt-8 max-w-xl text-[1.05rem] leading-relaxed text-cream/75">
              He is currently building at the intersection of AI, software engineering, reliability,
              and how people work.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
