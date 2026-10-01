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
    <footer className="border-t border-brass/50 bg-kiln text-cream">
      <div className="shell flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2.5 font-serif text-3xl tracking-[-0.03em]">
            <span aria-hidden="true" className="h-3 w-3 bg-cinnabar" />
            {site.name}
          </p>
          <p className="mt-3 text-sm text-cream/75">Projects and writing by Adewale Obadimu.</p>
        </div>
        {links.length > 0 ? (
          <nav aria-label="Contact">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {links.map((link) => {
                const external = link.href.startsWith("http");
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-11 items-center gap-1 text-cream/80 hover:text-cream"
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
      </div>
      <div className="shell pb-10 text-xs tracking-wide text-cream/60">© {year} Baodium</div>
    </footer>
  );
}
