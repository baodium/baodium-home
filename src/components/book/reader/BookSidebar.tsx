"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookPageOutline } from "@/components/book/reader/BookPageOutline";
import { chapterNumberLabel } from "@/lib/book/chapter-label";

export function BookSidebar({ chapters }: { chapters: BookChapterMeta[] }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, setFlipDirection } = useReader();
  const activeChapter = chapters.find((c) => pathname === `/system-design/${c.slug}`);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`book-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%,19rem)] flex-col border-r border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-chrome)] text-[var(--reader-fg)] transition-transform duration-300 lg:static lg:z-0 lg:h-full lg:w-[17.5rem] lg:translate-x-0 lg:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Table of contents"
        style={{ viewTransitionName: "reader-sidebar" }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] px-4 py-3.5">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
            Contents
          </p>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close contents"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ol className="space-y-0.5 text-sm">
            <li>
              <Link
                href="/system-design"
                className={`flex items-baseline gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] ${
                  pathname === "/system-design"
                    ? "bg-[color-mix(in_srgb,var(--reader-fg)_7%,transparent)] font-medium"
                    : ""
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  aria-hidden="true"
                  className="w-7 shrink-0 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--reader-muted)]"
                >
                  ··
                </span>
                Overview
              </Link>
            </li>
            {chapters.map((chapter) => {
              const href = `/system-design/${chapter.slug}`;
              const active = pathname === href;
              const number = chapterNumberLabel(chapter.slug);
              return (
                <li key={chapter.slug}>
                  <Link
                    href={href}
                    className={`flex items-baseline gap-3 rounded-lg px-3 py-2 leading-snug transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] ${
                      active
                        ? "bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] font-medium"
                        : "text-[var(--reader-muted)]"
                    }`}
                    onClick={() => {
                      if (activeChapter) {
                        const from = chapters.findIndex((c) => c.slug === activeChapter.slug);
                        const to = chapters.findIndex((c) => c.slug === chapter.slug);
                        setFlipDirection(to >= from ? 1 : -1);
                      } else {
                        setFlipDirection(1);
                      }
                      setSidebarOpen(false);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-7 shrink-0 font-mono text-[0.65rem] tracking-[0.08em] ${
                        active ? "text-cinnabar" : "text-[var(--reader-muted)]"
                      }`}
                    >
                      {number}
                    </span>
                    <span className="min-w-0">{chapter.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {activeChapter ? <BookPageOutline sections={activeChapter.sections} /> : null}
        </nav>
      </aside>
    </>
  );
}
