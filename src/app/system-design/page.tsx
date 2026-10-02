import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { book } from "@/data/writing";

const description = `Read ${book.title}: ${book.subtitle}, by ${book.author}. Free to read online.`;

export const metadata: Metadata = {
  title: `Read ${book.title}`,
  description,
  alternates: { canonical: book.readPath },
  openGraph: { title: `Read ${book.title} for free`, description, url: book.readPath },
};

export default function SystemDesignReader() {
  return (
    <>
      <header className="bg-cream px-3 pt-3 md:px-5 md:pt-5">
        <div className="shell flex items-center justify-between gap-4 py-3">
          <Link
            href="/#book"
            className="group inline-flex min-h-11 items-center gap-2.5 text-sm font-medium text-ink/75 transition-colors hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
            Baodium
          </Link>
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm text-ink/80 transition-colors hover:border-ink/35 hover:text-ink"
          >
            Buy the hardcover
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only"> (opens Amazon in a new tab)</span>
          </a>
        </div>
      </header>

      <main id="main" className="bg-cream px-3 pb-16 md:px-5 md:pb-24">
        <div className="grain relative overflow-hidden rounded-[2rem] bg-ember pb-6 pt-12 md:rounded-[3rem] md:pb-10 md:pt-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-10%] top-[-20%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.3),rgba(151,64,49,0.08)_55%,transparent)] blur-2xl"
          />

          <div className="shell relative z-[2]">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:gap-10">
              <div className="w-32 shrink-0 overflow-hidden rounded-[4px_8px_8px_4px] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] md:w-44">
                <Image
                  src={book.cover}
                  alt={`Cover of ${book.title} by ${book.author}`}
                  width={994}
                  height={1500}
                  sizes="(min-width: 768px) 11rem, 8rem"
                  priority
                  className="block h-auto w-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-[clamp(2.4rem,5.4vw,4.75rem)] font-bold uppercase leading-[0.9] tracking-[-0.045em]">
                  Practical <span className="text-flame">System</span> Design
                </h1>
                <p className="mt-4 max-w-xl font-serif text-[clamp(1.25rem,2vw,1.6rem)] italic leading-[1.2] text-cream/80">
                  {book.subtitle}
                </p>
                <p className="mt-3 text-sm text-cream/55">by {book.author}</p>
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#2a211c] md:mt-14">
              <div className="flex items-center justify-end gap-4 border-b border-white/10 px-4 py-2.5 text-xs text-cream/60">
                <a
                  href={book.driveHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-9 items-center gap-1.5 text-cream/75 transition-colors hover:text-cream"
                >
                  Open in Google Drive
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <iframe
                src={book.drivePreview}
                title="Practical System Design"
                allow="autoplay; fullscreen"
                allowFullScreen
                className="block h-[78svh] min-h-[520px] w-full bg-[#2f2620] md:h-[88svh] md:min-h-[720px]"
              />
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
