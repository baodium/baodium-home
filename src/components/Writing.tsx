import { ArrowUpRight } from "lucide-react";
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
        className="grid gap-2 py-5 md:grid-cols-12 md:items-baseline md:gap-8"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <time className="text-sm text-cream/60 md:col-span-3" dateTime={piece.date}>
          {formatDate(piece.date)}
        </time>
        <span className="font-serif text-2xl tracking-[-0.02em] md:col-span-4">{piece.title}</span>
        <span className="leading-relaxed text-cream/70 md:col-span-5">{piece.description}</span>
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    </li>
  );
}

export function Writing() {
  return (
    <section id="writing" aria-labelledby="writing-heading" className="section bg-ink text-cream">
      <Reveal>
        <div className="shell">
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="book-link grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,26rem)] lg:gap-20"
          >
            <div>
              <h2
                id="writing-heading"
                className="max-w-xl font-serif text-[clamp(2.75rem,5.2vw,5rem)] leading-[0.94] tracking-[-0.035em]"
              >
                {book.title}
              </h2>
              <div aria-hidden="true" className="mt-6 h-0.5 w-16 bg-cinnabar" />
              <p className="mt-6 max-w-md font-serif text-xl italic leading-snug text-cream/75 md:text-[1.65rem]">
                {book.subtitle}
              </p>
              <p className="mt-5 text-sm tracking-wide text-cream/80">{book.author}</p>
              <p className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm">
                <span className="border-b border-cinnabar pb-px">Amazon</span>
                <ArrowUpRight aria-hidden="true" className="card-arrow h-4 w-4" strokeWidth={1.75} />
                <span className="sr-only"> (opens in a new tab)</span>
              </p>
            </div>
            <div aria-hidden="true" className="pr-3">
              <BookCover />
            </div>
          </a>
          {writing.length === 0 ? (
            <p className="mt-16 text-sm text-cream/55">Writing will be added here.</p>
          ) : (
            <ul className="mt-16 divide-y divide-white/15 border-t border-white/15">
              {writing.map((piece) => (
                <Piece key={piece.href} piece={piece} />
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </section>
  );
}
