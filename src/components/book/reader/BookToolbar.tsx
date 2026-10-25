"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, List, Search } from "lucide-react";
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";

export function BookToolbar({
  onOpenSearch,
}: {
  onOpenSearch: () => void;
}) {
  const { setSidebarOpen } = useReader();

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-[var(--reader-bg)]/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open table of contents"
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link
            href="/#book"
            className="group inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
          >
            <ArrowLeft
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            />
            Baodium
          </Link>
        </div>
        <p className="hidden truncate font-serif text-sm italic text-[var(--reader-muted)] sm:block">
          {book.title}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-[var(--reader-muted)] hover:text-[var(--reader-fg)]"
            aria-label="Search book"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
          >
            Amazon
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </header>
  );
}
