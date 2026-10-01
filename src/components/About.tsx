import { Reveal } from "@/components/Reveal";

const areas = [
  {
    title: "Reliability Engineering",
    copy: "Distributed systems, production reliability, observability, incident response, and SRE.",
  },
  {
    title: "AI Products",
    copy: "Practical AI applications and agent-driven workflows.",
  },
  {
    title: "Infrastructure",
    copy: "Cloud, Kubernetes, telemetry, automation, and developer infrastructure.",
  },
  {
    title: "Writing",
    copy: "Practical system design and production engineering.",
  },
];

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="section bg-paper">
      <Reveal>
        <div className="shell grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h2
              id="about-heading"
              className="max-w-xl font-serif text-[clamp(1.85rem,3vw,2.85rem)] leading-[1.18] tracking-[-0.03em]"
            >
              Adewale Obadimu is a reliability engineer, technical leader, builder, and author.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              He is currently building at the intersection of AI, software engineering, reliability, and
              how people work.
            </p>
          </div>
          <dl className="lg:col-span-5 lg:border-l lg:border-line lg:pl-12">
            {areas.map((area) => (
              <div key={area.title} className="border-t border-line py-4 first:border-t-0 first:pt-0">
                <dt className="font-serif text-xl tracking-[-0.02em]">{area.title}</dt>
                <dd className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{area.copy}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}
