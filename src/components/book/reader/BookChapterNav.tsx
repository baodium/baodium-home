"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function BookChapterNav({
  prev,
  next,
}: {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}) {
  return (
    <nav
      className="mt-12 flex flex-col gap-4 border-t border-ink/10 pt-8 sm:flex-row sm:items-stretch sm:justify-between"
      aria-label="Chapter navigation"
    >
      {prev ? (
        <Link
          href={`/system-design/${prev.slug}`}
          className="group flex min-h-12 flex-1 flex-col rounded-xl border border-ink/10 px-4 py-3 transition-colors hover:border-ink/25 hover:bg-ink/[0.03] sm:max-w-[48%]"
        >
          <span className="flex items-center gap-1 text-xs font-mono uppercase tracking-[0.14em] text-[var(--reader-muted)]">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Previous
          </span>
          <span className="mt-1 font-serif text-lg leading-snug">{prev.title}</span>
        </Link>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
      {next ? (
        <Link
          href={`/system-design/${next.slug}`}
          className="group flex min-h-12 flex-1 flex-col rounded-xl border border-ink/10 px-4 py-3 text-right transition-colors hover:border-ink/25 hover:bg-ink/[0.03] sm:max-w-[48%]"
        >
          <span className="flex items-center justify-end gap-1 text-xs font-mono uppercase tracking-[0.14em] text-[var(--reader-muted)]">
            Next
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <span className="mt-1 font-serif text-lg leading-snug">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
