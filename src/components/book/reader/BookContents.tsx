import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, FlaskConical } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { book } from "@/data/writing";
import { chapterNumberLabel } from "@/lib/book/chapter-label";
import { BookResume } from "@/components/book/reader/BookResume";

export function BookContents({ chapters }: { chapters: BookChapterMeta[] }) {
  const start = chapters.find((c) => c.slug === "chapter-1") ?? chapters[0];

  return (
    <div className="book-contents-wrap mx-auto w-full max-w-[calc(var(--reader-measure)+3rem)] pt-2 md:pt-3">
      <div className="book-page relative overflow-hidden rounded-[1.15rem] px-5 py-9 sm:px-9 sm:py-11 md:px-12">
        <div aria-hidden="true" className="book-page-gutter" />
        <div aria-hidden="true" className="book-page-grain" />
        <div className="relative z-[1]">
          <BookResume chapters={chapters} />
          <div className="flex items-end gap-5">
            <div className="w-16 shrink-0 overflow-hidden rounded-[2px_6px_6px_2px] shadow-[0_16px_30px_-18px_rgba(70,40,20,0.55)] md:w-20">
              <Image
                src={book.cover}
                alt={`Cover of ${book.title} by ${book.author}`}
                width={994}
                height={1500}
                sizes="5rem"
                priority
                className="block h-auto w-full"
              />
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="font-serif text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] tracking-[-0.03em]">
                {book.title}
              </h1>
              <p className="mt-2 font-serif text-lg italic leading-snug text-[var(--reader-muted)]">
                {book.subtitle}
              </p>
              <p className="mt-2 text-sm text-[var(--reader-muted)]">{book.author}</p>
            </div>
          </div>

          <p className="mt-10 text-lg leading-relaxed text-[var(--reader-muted)]">
            Fourteen illustrative production incidents — and the design decisions behind reliable
            systems. Baodium, the company in these stories, is fictional; the failures and tradeoffs
            are teaching material, not claims about a real employer. Read online for free — no account
            required.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {start ? (
              <Link
                href={`/system-design/${start.slug}`}
                prefetch
                transitionTypes={["nav-forward"]}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-[var(--reader-page)] transition-opacity hover:opacity-90"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Start {start.slug === "chapter-1" ? "Chapter 1" : start.title}
              </Link>
            ) : null}
            <Link
              href="/system-design/experience/chapter-1"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_18%,transparent)] px-6 text-sm font-medium text-[var(--reader-fg)] transition-colors hover:border-cinnabar hover:text-cinnabar"
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Operate this incident
            </Link>
            <a
              href={book.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--reader-muted)] transition-colors hover:text-cinnabar"
            >
              Amazon
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <div className="mt-12 border-t border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] pt-8">
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
              Table of contents
            </h2>
            <ol className="mt-4 space-y-1.5 font-serif text-lg">
              {chapters.map((chapter) => (
                <li key={chapter.slug}>
                  <Link
                    href={`/system-design/${chapter.slug}`}
                    prefetch
                    transitionTypes={["nav-forward"]}
                    className="group grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-lg py-1.5 transition-colors hover:text-cinnabar"
                  >
                    <span className="font-mono text-xs tracking-[0.08em] text-[var(--reader-muted)] group-hover:text-cinnabar">
                      {chapterNumberLabel(chapter.slug)}
                    </span>
                    <span className="min-w-0">{chapter.title}</span>
                    <span
                      aria-hidden="true"
                      className="text-sm text-[var(--reader-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-10 border-t border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] pt-6 text-sm text-[var(--reader-muted)]">
            Enjoying the free read?{" "}
            <a
              href={book.amazonReviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--reader-fg)] underline-offset-4 hover:text-cinnabar hover:underline"
            >
              Rate it on Amazon
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
