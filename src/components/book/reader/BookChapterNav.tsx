"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { chapterKicker, chapterNumberLabel } from "@/lib/book/chapter-label";
import { flipNavigate } from "@/lib/book/flip-navigate";

export function BookChapterNav({
  prev,
  next,
}: {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}) {
  const router = useRouter();
  const { setFlipDirection } = useReader();

  return (
    <nav
      className="book-flip-nav mt-14 grid gap-3 border-t border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] pt-8 sm:grid-cols-2"
      aria-label="Chapter navigation"
    >
      {prev ? (
        <Link
          href={`/system-design/${prev.slug}`}
          onClick={(event) => {
            event.preventDefault();
            setFlipDirection(-1);
            flipNavigate(router, `/system-design/${prev.slug}`, -1);
          }}
          className="book-flip-card group relative overflow-hidden rounded-[1.1rem] border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--reader-page)_82%,transparent)] px-4 py-4 transition-[transform,border-color,box-shadow] hover:-translate-x-1 hover:border-cinnabar/40 hover:shadow-[0_22px_44px_-26px_rgba(28,22,16,0.5)]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber/50 via-cinnabar/40 to-transparent opacity-70"
          />
          <span className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
            <span aria-hidden="true" className="text-base leading-none">‹</span>
            Flip back
          </span>
          <span className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-xs text-cinnabar">{chapterNumberLabel(prev.slug)}</span>
            <span className="font-serif text-lg leading-snug">{chapterKicker(prev.slug, prev.title)}</span>
          </span>
          <span className="mt-1 block text-sm text-[var(--reader-muted)]">{prev.title}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={`/system-design/${next.slug}`}
          onClick={(event) => {
            event.preventDefault();
            setFlipDirection(1);
            flipNavigate(router, `/system-design/${next.slug}`, 1);
          }}
          className="book-flip-card group relative overflow-hidden rounded-[1.1rem] border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--reader-page)_82%,transparent)] px-4 py-4 text-right transition-[transform,border-color,box-shadow] hover:translate-x-1 hover:border-cinnabar/40 hover:shadow-[0_22px_44px_-26px_rgba(28,22,16,0.5)] sm:justify-self-stretch"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-amber/50 via-cinnabar/40 to-transparent opacity-70"
          />
          <span className="flex items-center justify-end gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
            Flip ahead
            <span aria-hidden="true" className="text-base leading-none">›</span>
          </span>
          <span className="mt-2 flex items-baseline justify-end gap-2.5">
            <span className="font-serif text-lg leading-snug">{chapterKicker(next.slug, next.title)}</span>
            <span className="font-mono text-xs text-cinnabar">{chapterNumberLabel(next.slug)}</span>
          </span>
          <span className="mt-1 block text-sm text-[var(--reader-muted)]">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
