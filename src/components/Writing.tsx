import { BookCover } from "@/components/BookCover";
import { Reveal } from "@/components/Reveal";
import { book, writing, type WritingPiece } from "@/data/writing";

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Piece({ piece }: { piece: WritingPiece }) {
  const external = piece.href.startsWith("http");
  return (
    <li>
      <a
        href={piece.href}
        className="group grid gap-2 py-6 md:grid-cols-12 md:items-baseline md:gap-8"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <time className="text-[0.75rem] tracking-[0.12em] text-bronze md:col-span-3" dateTime={piece.date}>
          {formatDate(piece.date)}
        </time>
        <span className="font-serif text-2xl tracking-[-0.02em] text-ink md:col-span-4">{piece.title}</span>
        <span className="leading-relaxed text-muted md:col-span-5">{piece.description}</span>
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    </li>
  );
}

export function Writing() {
  return (
    <section id="writing" aria-labelledby="writing-heading" className="section">
      <Reveal>
        <div className="shell">
          <h2
            id="writing-heading"
            className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze"
          >
            Writing
          </h2>
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="book-link mt-12 grid items-center gap-12 lg:grid-cols-12 lg:gap-16"
          >
            <div className="lg:col-span-7">
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-faint">Book</p>
              <h3 className="mt-4 max-w-xl font-serif text-4xl leading-[1.02] tracking-[-0.03em] md:text-6xl">
                {book.title}
              </h3>
              <p className="mt-5 max-w-md font-serif text-xl italic leading-snug text-muted md:text-2xl">
                {book.subtitle}
              </p>
              <p className="mt-6 text-sm text-ink">{book.author}</p>
              <p className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-ink">
                <span className="border-b border-current pb-px">Amazon</span>
                <span className="card-arrow" aria-hidden="true">
                  →
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </p>
            </div>
            <div className="lg:col-span-5 lg:justify-self-end" aria-hidden="true">
              <BookCover />
            </div>
          </a>
          <div className="mt-20 border-t border-line pt-10">
            <h3 className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze">
              Essays and write-ups
            </h3>
            {writing.length === 0 ? (
              <p className="mt-6 max-w-md text-muted">Writing will be added here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line border-b border-line">
                {writing.map((piece) => (
                  <Piece key={piece.href} piece={piece} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
