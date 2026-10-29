import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { book } from "@/data/writing";

export function PlayChrome({
  children,
  crumb,
}: {
  children: ReactNode;
  crumb?: { label: string; href?: string };
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-[#fbfcfe]/92 backdrop-blur-xl">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-3.5 text-ink">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="group inline-flex min-h-10 items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.28em] transition-colors hover:text-cinnabar"
              aria-label="Baodium, back to home"
            >
              <span aria-hidden="true" className="relative h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-[3px] bg-cinnabar transition-transform duration-500 group-hover:rotate-45" />
              </span>
              BAODIUM
            </Link>
            <span className="text-ink/25" aria-hidden="true">
              /
            </span>
            {crumb ? (
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[0.84rem]">
                <Link href="/play" className="text-muted transition-colors hover:text-ink">
                  Drills
                </Link>
                <span className="text-ink/25" aria-hidden="true">
                  /
                </span>
                {crumb.href ? (
                  <Link href={crumb.href} className="truncate text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate text-ink">{crumb.label}</span>
                )}
              </nav>
            ) : (
              <span className="text-[0.84rem] text-ink">Drills</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[0.84rem] sm:gap-4">
            <Link
              href="/system-design/experience"
              className="hidden text-muted transition-colors hover:text-ink sm:inline"
            >
              Labs
            </Link>
            <Link href="/about" className="hidden text-muted transition-colors hover:text-ink sm:inline">
              About
            </Link>
            <Link href="/play" className="text-muted transition-colors hover:text-ink">
              All drills
            </Link>
            <Link
              href={book.readPath}
              className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-[0.8rem] font-medium text-cream transition-colors hover:bg-cinnabar"
            >
              Read the book for free
            </Link>
          </div>
        </div>
      </header>
      <main
        id="main"
        className="bg-[#f4f7fa] pb-16 pt-10 text-ink md:pb-24 md:pt-14"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
