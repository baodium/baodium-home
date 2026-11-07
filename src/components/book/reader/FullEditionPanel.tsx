import { book } from "@/data/writing";

/** One purchase panel. The Amazon address lives on `book.href`. */
export function FullEditionPanel({ atEnd = false }: { atEnd?: boolean }) {
  const Title = atEnd ? "h2" : "h1";
  return (
    <section
      className={
        atEnd
          ? "mt-16 border-t border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] pt-12"
          : ""
      }
      aria-label="Full edition"
    >
      <Title className="max-w-[18ch] font-serif text-[clamp(2rem,4vw,2.75rem)] leading-[1.08] tracking-[-0.03em]">
        The rest of the book
      </Title>
      <div className="mt-8 max-w-[42rem] space-y-5 font-serif text-[1.2rem] leading-[1.7]">
        <p>
          You have been reading {book.title}. Chapters 1 through 7 are here in full. If you
          are enjoying the book, the rest of it is the full edition.
        </p>
        <p>
          The full edition continues from the next chapter through the last chapter, the
          epilogue, and the appendices. Buy it on Amazon.
        </p>
      </div>
      <a
        href={book.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex min-h-12 items-center bg-[var(--reader-fg)] px-5 text-base font-medium text-[var(--reader-page)]"
      >
        Buy it on Amazon
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}
