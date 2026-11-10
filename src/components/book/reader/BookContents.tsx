import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, FlaskConical } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { book } from "@/data/writing";
import { chapterNumberLabel } from "@/lib/book/chapter-label";
import { isFullEditionSlug } from "@/lib/book/edition";
import { BookResume } from "@/components/book/reader/BookResume";
import { ChapterPlate } from "@/components/learning/ChapterPlate";
import { figureForChapter } from "@/lib/learning/chapter-figures";
import { CHAPTERS, getChapter, labActionLabel } from "@/lib/learning/registry";
import { withReturnToReading } from "@/lib/learning/interactive-concepts";

export function BookContents({ chapters }: { chapters: BookChapterMeta[] }) {
  const start = chapters.find((c) => c.slug === "chapter-1") ?? chapters[0];
  const ch1 = getChapter("chapter-1");
  const labHref = ch1?.labHref
    ? withReturnToReading(ch1.labHref, "chapter-1", "diagnosing-connection-pool-saturation")
    : "/system-design/experience/chapter-1";

  return (
    <div className="book-contents-wrap mx-auto w-full max-w-[calc(var(--reader-measure)+3rem)] pt-2 md:pt-3">
      <div className="book-page relative overflow-hidden rounded-[1.15rem] px-5 py-9 sm:px-9 sm:py-11 md:px-12">
        <div aria-hidden="true" className="book-page-gutter" />
        <div aria-hidden="true" className="book-page-grain" />
        <div className="relative z-[1]">
          <BookResume chapters={chapters} />
          <div className="flex items-end gap-5">
            <div className="w-24 shrink-0 overflow-hidden rounded-[2px_6px_6px_2px] shadow-[0_16px_30px_-18px_rgba(70,40,20,0.55)] md:w-32">
              <Image
                src={book.cover}
                alt={`Cover of ${book.title} by ${book.author}`}
                width={994}
                height={1500}
                sizes="(max-width: 768px) 96px, 128px"
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
            Fourteen production incidents, and the design decisions behind reliable systems.
            Baodium, the company in these stories, is fictional. The failures and tradeoffs are
            teaching material, not claims about a real employer. Chapters 1–7 are free online; the full edition is available on Amazon.
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
              href={labHref}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_18%,transparent)] px-6 text-sm font-medium text-[var(--reader-fg)] transition-colors hover:border-cinnabar hover:text-cinnabar"
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              {ch1 ? labActionLabel(ch1) : "The product page and the pool"}
            </Link>
            <Link href="/system-design/experience" className="inline-flex min-h-12 items-center gap-2 px-3 text-sm text-[var(--reader-muted)] underline underline-offset-4">All chapter experiences</Link>
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
              {chapters.map((chapter) => {
                const lab = getChapter(chapter.slug);
                const locked = isFullEditionSlug(chapter.slug);
                return (
                  <li
                    key={chapter.slug}
                    className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg py-2 sm:grid-cols-[2.4rem_4.75rem_minmax(0,1fr)_auto]"
                  >
                    <span className="font-mono text-xs tracking-[0.08em] text-[var(--reader-muted)]">
                      {chapterNumberLabel(chapter.slug)}
                    </span>
                    {figureForChapter(chapter.slug) ? (
                      <ChapterPlate
                        chapter={chapter.slug}
                        sizes="76px"
                        className="hidden h-12 w-[4.75rem] sm:block"
                      />
                    ) : (
                      <span className="hidden sm:block" aria-hidden="true" />
                    )}
                    <Link
                      href={`/system-design/${chapter.slug}`}
                      prefetch
                      transitionTypes={["nav-forward"]}
                      className="min-w-0 transition-colors hover:text-cinnabar"
                      aria-label={locked ? `${chapter.title}, full edition` : undefined}
                    >
                      <span className="block">{chapter.title}</span>
                      {lab ? <span className="mt-1 block font-sans text-[13px] leading-relaxed text-[var(--reader-muted)]">{chapterDescription(chapter.slug)}</span> : null}
                    </Link>
                    {locked ? (
                      <span className="font-mono text-[0.72rem] text-[var(--reader-muted)]">
                        Full edition
                      </span>
                    ) : lab?.labHref && labActionLabel(lab) ? (
                      <Link
                        href={lab.labHref}
                        className="max-w-[14rem] text-right font-mono text-[0.72rem] leading-snug text-[var(--reader-muted)] transition-colors hover:text-cinnabar"
                      >
                        {labActionLabel(lab)}
                      </Link>
                    ) : (
                      <span className="font-mono text-[0.72rem] text-[var(--reader-muted)]">
                        {lab ? "Book" : ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="mt-10 border-t border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] pt-6 text-sm text-[var(--reader-muted)]">
            Enjoying this?{" "}
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

const CHAPTER_DESCRIPTIONS = [
  "Follow a feature rollout into connection-pool contention, and learn what actually bounds demand.",
  "Separate arrival rate, work in progress and request duration before choosing a capacity limit.",
  "Reason about retries, idempotency and ambiguous outcomes when a timed-out operation may have committed.",
  "Carry deadlines and cancellation across service boundaries to contain cascading failure.",
  "Trade freshness against latency and load, and reason about behavior when cached data misses.",
  "Make deployment artifacts reproducible and understand the boundaries containers provide.",
  "Choose replication, partitioning and sharding strategies around ownership and failure behavior.",
  "Use metrics, logs and traces to explain the health of a request path.",
  "Design operational guardrails that bound failure and protect shared capacity.",
  "Treat rollouts as controlled experiments with observable evidence and a recovery path.",
  "Find service boundaries by examining state, ownership and the cost of coordination.",
  "Reason about asynchronous processing, delivery semantics, lag and backpressure.",
  "Operate machine-learning systems with attention to data, model behavior and production feedback.",
  "Bring the tradeoffs together and build a design from explicit production constraints.",
];
function chapterDescription(slug: string) {
  const chapter = CHAPTERS.find((item) => item.slug === slug);
  return chapter ? CHAPTER_DESCRIPTIONS[chapter.number - 1] : "";
}
