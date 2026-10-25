"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { BookSearchEntry } from "@/lib/book/types";

export function BookSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<BookSearchEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/book/search-index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index
      .filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.excerpt.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [index, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/50 px-4 pt-[12vh] backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search book"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink/10 bg-[var(--reader-bg)] text-[var(--reader-fg)] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-ink/10 px-3 py-2">
          <Search className="h-4 w-4 text-[var(--reader-muted)]" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chapters…"
            className="min-h-11 flex-1 bg-transparent text-base outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--reader-muted)]">
              {query ? "No matches." : "Type to search chapter text."}
            </li>
          ) : (
            results.map((hit) => (
              <li key={hit.slug}>
                <Link
                  href={`/system-design/${hit.slug}`}
                  onClick={onClose}
                  className="block rounded-xl px-3 py-3 transition-colors hover:bg-ink/[0.05]"
                >
                  <p className="font-medium">{hit.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--reader-muted)]">
                    {hit.excerpt}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
