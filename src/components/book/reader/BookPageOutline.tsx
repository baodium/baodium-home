"use client";

import { useEffect, useState } from "react";
import type { BookSection } from "@/lib/book/types";

export function BookPageOutline({ sections }: { sections: BookSection[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const headings = sections.filter((s) => s.level <= 3);

  useEffect(() => {
    if (headings.length === 0) return;
    const nodes = headings
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.25, 0.6] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav className="book-page-outline mt-5 border-t border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] pt-4" aria-label="On this page">
      <p className="mb-2 px-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--reader-muted)]">
        On this page
      </p>
      <ol className="space-y-0.5 text-[0.78rem] leading-snug">
        {headings.map((section) => {
          const active = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block rounded-md py-1.5 transition-colors hover:text-[var(--reader-fg)] ${
                  section.level >= 3 ? "pl-5" : "pl-3"
                } ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] font-medium text-[var(--reader-fg)]"
                    : "text-[var(--reader-muted)]"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
