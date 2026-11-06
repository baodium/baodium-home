"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/" },
  { label: "Book", href: "/system-design" },
  { label: "Projects", href: "/projects" },
];

function currentHref(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return "/projects";
  if (pathname === "/system-design" || (pathname.startsWith("/system-design/") && !pathname.startsWith("/system-design/experience"))) {
    return "/system-design";
  }
  return "";
}

/** The book bar: BAODIUM, Home, Book, Projects. */
export function SiteHeader({ fixed = false }: { fixed?: boolean }) {
  const pathname = usePathname() ?? "";
  const current = currentHref(pathname);

  return (
    <header
      className={`z-50 border-b border-[#e6ddd2] bg-[#fbf7f1] text-[#241c18] ${
        fixed ? "fixed inset-x-0 top-0" : "sticky top-0"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3.5 sm:px-8">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2.5 font-mono text-[0.8rem] font-medium tracking-[0.18em]"
          aria-label="Baodium home"
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-cinnabar" />
          BAODIUM
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1 text-base">
          {links.map((link) => {
            const active = current === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center px-3 ${
                  active ? "font-medium text-[#241c18]" : "text-[#6f625a] hover:text-[#241c18]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
