import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { book } from "@/data/writing";

export function BookContents({ chapters }: { chapters: BookChapterMeta[] }) {
  const start = chapters.find((c) => c.slug === "chapter-1") ?? chapters[0];

  return (
    <div className="mx-auto w-full max-w-[40rem]">
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
        Fourteen production incidents and the design decisions behind reliable systems. Read
        online for free — no account required.
      </p>

      {start ? (
        <Link
          href={`/system-design/${start.slug}`}
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-[var(--reader-bg)] transition-opacity hover:opacity-90"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Start {start.slug === "chapter-1" ? "Chapter 1" : start.title}
        </Link>
      ) : null}

      <div className="mt-12 border-t border-ink/10 pt-8">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
          Table of contents
        </h2>
        <ol className="mt-4 space-y-2 font-serif text-lg">
          {chapters.map((chapter) => (
            <li key={chapter.slug}>
              <Link
                href={`/system-design/${chapter.slug}`}
                className="group inline-flex w-full items-baseline justify-between gap-4 rounded-lg py-1.5 transition-colors hover:text-cinnabar"
              >
                <span>{chapter.title}</span>
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
    </div>
  );
}
