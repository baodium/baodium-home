import { Mark } from "@/components/Mark";
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

export function Focus() {
  return (
    <section id="focus" aria-labelledby="focus-heading" className="section bg-paper">
      <Reveal>
        <div className="shell">
          <Mark index="04" title="What I work on" id="focus-heading" />
          <ol className="mt-12 border-b border-line">
            {areas.map((area, index) => (
              <li
                key={area.title}
                className="grid gap-3 border-t border-line py-8 md:grid-cols-12 md:items-baseline md:gap-8"
              >
                <span className="font-serif text-4xl leading-none text-cinnabar md:col-span-2">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-2xl tracking-[-0.03em] md:col-span-4 md:text-[1.85rem]">
                  {area.title}
                </h3>
                <p className="max-w-md leading-relaxed text-muted md:col-span-6">{area.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
