import { ArrowUpRight } from "lucide-react";
import { Mark } from "@/components/Mark";
import { projects } from "@/data/projects";
import { book } from "@/data/writing";

type Item = {
  label: string;
  href?: string;
  external?: boolean;
};

const columns: { title: string; href: string; items: Item[] }[] = [
  {
    title: "Engineering",
    href: "#focus",
    items: [
      { label: "Reliability Engineering", href: "#focus" },
      { label: "Distributed Systems", href: "#focus" },
      { label: "Infrastructure", href: "#focus" },
    ],
  },
  {
    title: "Products",
    href: "#work",
    items: projects.map((project) => ({
      label: project.name,
      href: project.url,
      external: true,
    })),
  },
  {
    title: "Writing",
    href: "#writing",
    items: [{ label: book.title, href: book.href, external: true }],
  },
];

function Node({
  label,
  href,
  external,
  emphasis = false,
}: Item & { emphasis?: boolean }) {
  const className = `flex min-h-11 items-center gap-2 ${
    emphasis ? "font-serif text-[1.55rem] tracking-[-0.03em] text-ink" : "text-ink/80 hover:text-cinnabar"
  }`;

  if (!href) return <span className={className}>{label}</span>;

  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <span>{label}</span>
      {external ? (
        <>
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      ) : null}
    </a>
  );
}

export function ExplorationMap() {
  return (
    <section id="map" aria-labelledby="map-heading" className="section bg-sand">
      <div className="shell">
        <Mark index="03" title="Map" id="map-heading" />
        <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {columns.map((column, index) => (
            <div key={column.title} className="border-t-2 border-kiln pt-5">
              <p className="text-[0.68rem] tracking-[0.18em] text-muted">0{index + 1}</p>
              <Node href={column.href} label={column.title} emphasis />
              <ul className="mt-2">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <Node {...item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
