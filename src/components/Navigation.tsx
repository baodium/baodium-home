"use client";

import { useEffect } from "react";

const links = [
  { href: "#work", id: "work", label: "Work" },
  { href: "#writing", id: "writing", label: "Writing" },
  { href: "#about", id: "about", label: "About" },
];

export function Navigation() {
  useEffect(() => {
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[data-nav]"),
    );
    const sections = links
      .map((link) => document.getElementById(link.id))
      .filter((section): section is HTMLElement => section !== null);

    const setCurrent = (id: string | null) => {
      anchors.forEach((anchor) => {
        if (id && anchor.dataset.nav === id) {
          anchor.setAttribute("aria-current", "location");
        } else {
          anchor.removeAttribute("aria-current");
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.2, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header id="top" className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="shell flex items-center justify-between gap-4 py-1">
        <a href="#top" className="inline-flex min-h-11 items-center text-[0.78rem] tracking-[0.22em] text-ink">
          BAODIUM
        </a>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1 text-[0.9rem] text-muted md:gap-3">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  data-nav={link.id}
                  className="nav-link inline-flex min-h-11 items-center px-2 whitespace-nowrap"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
