"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { book } from "@/data/writing";

export function BookReader({ pages }: { pages: readonly string[] }) {
  const total = pages.length;
  const [index, setIndex] = useState(0);
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const hasPages = total > 0;

  useEffect(() => {
    if (!hasPages) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight") setIndex((value) => Math.min(total - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPages, total]);

  const progress = hasPages ? ((safeIndex + 1) / total) * 100 : 0;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-[#f6f1e7]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[46rem] items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link
            href="/#book"
            className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
            Baodium
          </Link>
          <p className="hidden truncate font-serif text-sm italic text-ink/55 sm:block">{book.title}</p>
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
          >
            Amazon
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </header>

      <main id="main" className="bg-[#f6f1e7] text-ink">
        <article className="mx-auto w-full max-w-[40rem] px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
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
              <p className="mt-2 font-serif text-lg italic leading-snug text-ink/70">{book.subtitle}</p>
              <p className="mt-2 text-sm text-ink/50">{book.author}</p>
            </div>
          </div>

          <div className="mt-10 border-t border-ink/10 pt-8">
            {hasPages ? (
              <div className="font-serif text-[1.2rem] leading-[1.75] text-ink/90 md:text-[1.28rem]">
                {pages[safeIndex].split(/\n{2,}/).map((paragraph, paragraphIndex) => (
                  <p key={`${safeIndex}-${paragraphIndex}`} className={paragraphIndex === 0 ? "" : "mt-6"}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-sm border border-ink/10 bg-[#fbf7f1] shadow-[0_24px_50px_-36px_rgba(70,40,20,0.45)]">
                <iframe
                  src={book.drivePreview}
                  title={book.title}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="block h-[72vh] min-h-[480px] w-full bg-[#fbf7f1]"
                />
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="h-px overflow-hidden bg-ink/10" aria-hidden="true">
              <div className="h-full bg-ink/70 transition-[width] duration-300" style={{ width: hasPages ? `${progress}%` : "0%" }} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
              {hasPages ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIndex((value) => Math.max(0, value - 1))}
                    disabled={safeIndex === 0}
                    className="inline-flex min-h-11 items-center gap-1.5 text-ink/70 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                    Previous
                  </button>
                  <p className="font-mono text-xs tracking-[0.08em] text-ink/45">
                    {safeIndex + 1} <span className="text-ink/30">/</span> {total}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIndex((value) => Math.min(total - 1, value + 1))}
                    disabled={safeIndex === total - 1}
                    className="inline-flex min-h-11 items-center gap-1.5 text-ink/70 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    Next
                    <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <a
                  href={book.driveHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-1.5 text-ink/60 transition-colors hover:text-ink"
                >
                  Open in Google Drive
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
