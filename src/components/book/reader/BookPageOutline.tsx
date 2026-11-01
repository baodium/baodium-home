"use client";

import { useEffect, useState } from "react";
import type { BookSection } from "@/lib/book/types";

export function BookPageOutline({ sections }: { sections: BookSection[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Prefer section-level headings so the outline stays light against CONTENTS.
  const headings = sections.filter((s) => s.level === 2).slice(0, 6);

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
    <details className="book-page-outline group/outline mt-0.5" aria-label="On this page">
      <summary className="cursor-pointer list-none rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)] [&::-webkit-details-marker]:hidden">
        On this page
        <span aria-hidden="true" className="ml-1 opacity-60 group-open/outline:hidden">
          · {headings.length}
        </span>
      </summary>
      <ol className="mt-0.5 space-y-px pb-1 text-[0.7rem] leading-snug">
        {headings.map((section) => {
          const active = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block rounded-md border-l-2 py-1 pl-2.5 transition-colors hover:text-[var(--reader-fg)] ${
                  active
                    ? "border-cinnabar/70 font-medium text-[var(--reader-fg)]"
                    : "border-transparent text-[var(--reader-muted)]"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
