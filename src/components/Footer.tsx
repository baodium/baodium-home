import { ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";

const links = [
  { label: "GitHub", href: site.github },
  { label: "LinkedIn", href: site.linkedin },
  { label: "Email", href: site.email },
].filter((link) => link.href.length > 0);

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink bg-paper">
      <div className="shell flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between md:py-14">
        <div>
          <p className="font-serif text-[clamp(2.4rem,4vw,3.5rem)] leading-none tracking-[-0.04em]">
            Baodium
          </p>
          <p className="mt-3 text-sm text-muted">Projects and writing by Adewale Obadimu.</p>
        </div>
        {links.length > 0 ? (
          <nav aria-label="Contact">
            <ul className="flex flex-wrap gap-x-5 text-sm">
              {links.map((link) => {
                const external = link.href.startsWith("http");
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-11 items-center gap-1 text-ink"
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                      {external ? (
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : null}
                      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
        <p className="text-sm text-muted">© {year} Baodium</p>
      </div>
    </footer>
  );
}
