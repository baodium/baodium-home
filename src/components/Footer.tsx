import Link from "next/link";
import { site } from "@/data/site";

const links = [
  { label: "Home", href: "/", external: false },
  { label: "Book", href: "/system-design", external: false },
  { label: "Projects", href: "/projects", external: false },
  { label: site.emailLabel, href: site.email, external: true },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/10 bg-cream px-5 py-4 text-ink">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
        <p className="text-muted">© {year} Baodium</p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map((link) => (
              <li key={link.label}>
                {link.external ? (
                  <a href={link.href} className="text-muted transition-colors hover:text-ink">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} className="text-muted transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
