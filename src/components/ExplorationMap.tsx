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
  const className = `flex min-h-11 items-center gap-3 text-[0.98rem] ${
    emphasis ? "font-serif text-[1.35rem] tracking-[-0.02em] text-ink" : "text-muted hover:text-ink"
  }`;

  if (!href) {
    return <span className={className}>{label}</span>;
  }

  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <span>{label}</span>
      {external ? (
        <>
          <span aria-hidden="true" className="text-[0.8rem] text-faint">
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      ) : null}
    </a>
  );
}

export function ExplorationMap() {
  return (
    <section id="map" aria-labelledby="map-heading" className="section">
      <div className="shell">
        <h2
          id="map-heading"
          className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze"
        >
          Map
        </h2>
        <div className="mt-12 grid gap-12 border-line lg:mt-14 lg:grid-cols-3 lg:gap-8 lg:border-t lg:pt-8">
          {columns.map((column) => (
            <div key={column.title} className="border-l border-line-strong pl-5">
              <Node href={column.href} label={column.title} emphasis />
              <ul className="mt-4">
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
