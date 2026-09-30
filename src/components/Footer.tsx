import { site } from "@/data/site";

const links = [
  { label: "GitHub", href: site.github, external: true },
  { label: "LinkedIn", href: site.linkedin, external: true },
  { label: "Email", href: site.email, external: false },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="shell flex flex-col gap-10 py-14 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-serif text-3xl tracking-[-0.02em]">{site.name}</p>
          <p className="mt-3 text-sm text-muted">Projects and writing by Adewale Obadimu.</p>
        </div>
        <nav aria-label="Contact">
          <ul className="flex gap-6 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-muted transition-colors hover:text-ink"
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                  {link.external ? (
                    <span className="sr-only"> (opens in a new tab)</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="shell pb-10 text-xs tracking-wide text-faint">© {year} Baodium</div>
    </footer>
  );
}
